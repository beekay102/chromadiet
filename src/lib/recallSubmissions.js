// =============================================================
// src/lib/recallSubmissions.js
// Submission helper. Wraps the multi-step write to Supabase
// (recall_sessions + photo uploads + food_entries) with retry and
// orphan cleanup.
//
// Order of operations:
//   1. Insert recall_sessions row → get session_id
//   2. Upload all photos in parallel to {user_id}/{session_id}/{idx}.{ext}
//      - Per-photo retry on transient failure
//      - On final per-photo failure, ask the caller (via onPhotoFailure) what to do
//   3. Insert food_entries batch with photo_storage_path populated
//   4. On any failure: delete uploaded photos AND the session row (orphan cleanup)
//
// Why no transaction: Supabase's PostgREST API doesn't expose
// multi-statement transactions to clients. We do the writes
// sequentially and clean up on failure.
//
// recall_results writes are NOT done here — those happen
// server-side from analyze.js using the service-role key (RLS on
// recall_results denies user-side INSERTs by design).
// =============================================================

import { supabase } from './supabase';
import { uploadPhoto, deletePhotos } from './photoUpload';

/**
 * Submit a recall to Supabase.
 *
 * @param {object} opts
 * @param {Array}  opts.entries     Entries[] array from ChromaDiet state.
 *                                  Each entry: { id, foodId, portionG, meal,
 *                                  description, components, photo (data URL or null), ... }.
 * @param {string} opts.recallDate  Optional ISO date (YYYY-MM-DD). Defaults to today (UTC).
 * @param {string} opts.notes       Optional free-text notes for the session.
 * @param {function} opts.onRetrying Optional callback invoked after the first
 *                                   submit attempt fails and before the retry. Lets
 *                                   the caller flip a "Retrying..." flag in UI state.
 * @param {function} opts.onPhotoStart   Optional (entryId) — fired when a photo upload starts.
 * @param {function} opts.onPhotoEnd     Optional (entryId, ok) — fired when a photo upload finishes.
 *                                       ok=true on success, ok=false on final failure.
 * @param {function} opts.onPhotoFailure Optional async (entryId, errMessage) → boolean.
 *                                       Called after a photo's first attempt + retry both fail.
 *                                       Return truthy → submit without that photo, continue.
 *                                       Return falsy  → abort the submission, clean up.
 *                                       If omitted, default behavior is to abort.
 *
 * @returns {Promise<{sessionId: string, photosUploaded: number, photosSkipped: number}>}
 *
 * @throws {Error}
 *   With a human-readable .message on final failure. Any partial session
 *   row and uploaded photos will have been cleaned up before the error escapes.
 */
export async function submitRecall({
  entries,
  recallDate,
  notes,
  onRetrying,
  onPhotoStart,
  onPhotoEnd,
  onPhotoFailure,
} = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Cannot submit a recall with no food entries.');
  }

  // Default recall_date to today (UTC). DB column is `date`, not timestamptz.
  const dateStr = recallDate || new Date().toISOString().slice(0, 10);

  return await runWithRetry(
    () => attemptSubmit({ entries, dateStr, notes, onPhotoStart, onPhotoEnd, onPhotoFailure }),
    onRetrying
  );
}

/**
 * One submission attempt:
 *   1. Insert recall_sessions row (status='submitted')
 *   2. Upload all photos in parallel using the new session_id
 *      - Each photo gets a single retry on transient failure
 *      - On final per-photo failure, ask onPhotoFailure callback whether
 *        to skip that photo or abort
 *   3. Insert food_entries batch with photo_storage_path populated
 *
 * On any failure, performs cleanup:
 *   - Deletes uploaded photos
 *   - Deletes the session row (which cascades to any partially-inserted entries)
 */
async function attemptSubmit({ entries, dateStr, notes, onPhotoStart, onPhotoEnd, onPhotoFailure }) {
  let sessionId = null;
  const uploadedPaths = []; // for cleanup if a later step fails

  // Pull the current user's id explicitly. Some Supabase configurations
  // don't set user_id via DEFAULT auth.uid() at the table level — and
  // even when they do, being explicit is more robust.
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    throw new Error('Not signed in. Please sign in and try again.');
  }
  const userId = userData.user.id;

  try {
    // ── Step 1: insert recall_sessions row ──────────────────
    const { data: sessionData, error: sessionErr } = await supabase
      .from('recall_sessions')
      .insert({
        user_id: userId,
        recall_date: dateStr,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        notes: notes || null,
      })
      .select('id')
      .single();

    if (sessionErr) throw sessionErr;
    sessionId = sessionData.id;

    // ── Step 2: upload photos in parallel ───────────────────
    // Build a list of {entry, originalIndex} for entries that have a photo.
    const photoTasks = entries
      .map((entry, idx) => ({ entry, idx }))
      .filter(({ entry }) => !!entry.photo);

    // Map from original entry idx → resolved storage path (or null if skipped).
    const pathByIdx = new Map();

    if (photoTasks.length > 0) {
      const results = await Promise.all(
        photoTasks.map(async ({ entry, idx }) => {
          if (typeof onPhotoStart === 'function') {
            try { onPhotoStart(entry.id); } catch { /* ignore UI errors */ }
          }

          // Try once, retry once.
          let path = null;
          let lastErr = null;
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const result = await uploadPhoto({ dataUrl: entry.photo, userId, sessionId, index: idx });
              path = result.path;
              uploadedPaths.push(path);
              break;
            } catch (e) {
              lastErr = e;
              // brief delay between attempts
              if (attempt === 0) await sleep(500);
            }
          }

          if (!path) {
            // Both attempts failed. Ask the caller what to do.
            const skip = typeof onPhotoFailure === 'function'
              ? await safeAsync(() => onPhotoFailure(entry.id, lastErr?.message || 'Upload failed.'))
              : false;

            if (typeof onPhotoEnd === 'function') {
              try { onPhotoEnd(entry.id, false); } catch { /* ignore */ }
            }

            if (!skip) {
              // Abort. Throw — outer catch will clean up.
              throw new Error(`Photo upload failed for an entry: ${lastErr?.message || 'unknown error'}`);
            }
            return { idx, path: null }; // explicit "no photo path" for this entry
          }

          if (typeof onPhotoEnd === 'function') {
            try { onPhotoEnd(entry.id, true); } catch { /* ignore */ }
          }
          return { idx, path };
        })
      );

      for (const { idx, path } of results) {
        pathByIdx.set(idx, path); // path may be null if user opted to skip
      }
    }

    // ── Step 3: insert food_entries batch ───────────────────
    const rows = entries.map((e, idx) => ({
      session_id: sessionId,
      user_id: userId,
      meal_occasion: e.meal || 'Snack',
      food_id: e.foodId || null,
      portion_g: typeof e.portionG === 'number' && e.portionG > 0 ? e.portionG : null,
      description: e.description || null,
      photo_storage_path: pathByIdx.has(idx) ? pathByIdx.get(idx) : null,
      ai_scan_used: !!(e.aiScanUsed),
      ai_confidence: typeof e.aiConfidence === 'number' ? e.aiConfidence : null,
      ai_reasoning: e.aiReasoning || null,
      components: e.components || null,
      display_order: idx,
    }));

    const { error: entriesErr } = await supabase
      .from('food_entries')
      .insert(rows);

    if (entriesErr) throw entriesErr;

    return {
      sessionId,
      photosUploaded: uploadedPaths.length,
      photosSkipped: photoTasks.length - uploadedPaths.length,
    };

  } catch (err) {
    // Orphan cleanup: delete any uploaded photos AND the session row.
    // Doing photos first so they don't outlive the session id reference.
    if (uploadedPaths.length > 0) {
      await deletePhotos(uploadedPaths);
    }
    if (sessionId) {
      try {
        await supabase.from('recall_sessions').delete().eq('id', sessionId);
      } catch (cleanupErr) {
        // eslint-disable-next-line no-console
        console.warn('[submitRecall] Orphan session cleanup failed:', cleanupErr);
      }
    }
    throw err;
  }
}

// Promise-safe wrapper for arbitrary callbacks. Returns null on throw.
async function safeAsync(fn) {
  try { return await fn(); } catch { return null; }
}

/**
 * Run a function once, and if it throws, retry once after a short delay.
 * Used to absorb transient network blips. The caller still gets the final
 * error if the retry also fails. Calls onRetrying between attempts so the
 * UI can show a "retrying..." state.
 *
 * @param {function} fn          Async function to run.
 * @param {function} onRetrying  Optional callback invoked between attempts.
 */
async function runWithRetry(fn, onRetrying) {
  try {
    return await fn();
  } catch (firstErr) {
    // Don't retry on validation errors — those won't fix themselves.
    if (isClientValidationError(firstErr)) throw enhanceError(firstErr);

    // eslint-disable-next-line no-console
    console.warn('[submitRecall] First attempt failed, retrying:', firstErr?.message);
    if (typeof onRetrying === 'function') {
      try { onRetrying(); } catch { /* ignore UI callback errors */ }
    }

    await sleep(800);
    try {
      return await fn();
    } catch (retryErr) {
      throw enhanceError(retryErr);
    }
  }
}

/**
 * Returns true if the error is a 4xx-ish thing where retrying won't help.
 * Network errors, 500s, and timeouts all return false.
 */
function isClientValidationError(err) {
  // Supabase / PostgREST error codes are in err.code (e.g. 'PGRST204').
  // HTTP status (when present) is in err.status.
  const status = err?.status;
  if (typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return true;
  }
  return false;
}

/**
 * Add user-friendly messaging to errors before they escape this module.
 */
function enhanceError(err) {
  const msg = err?.message || 'Unknown error during submission.';
  const e = new Error(`Submission failed: ${msg}`);
  e.cause = err;
  return e;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
