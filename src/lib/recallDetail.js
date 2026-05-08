// =============================================================
// src/lib/recallDetail.js
// Data access for the per-recall detail expansion in My History.
//
// Given a session_id, returns the food_entries for that session
// PLUS pre-signed URLs for any photos (1-hour TTL).
//
// Why signed URLs: chromadiet-photos is a private bucket. Direct
// storage paths aren't viewable. We create short-lived signed URLs
// per-thumbnail, lazily, only when a row is expanded. Closing and
// re-expanding the row will fetch fresh URLs — fine since the cost
// is one Storage API call per entry-with-photo.
// =============================================================

import { supabase } from './supabase';

const BUCKET = 'chromadiet-photos';
const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour

/**
 * Fetch detail for one recall session.
 *
 * @param {string} sessionId
 * @returns {Promise<{entries: Array<EntryDetail>}>}
 *
 * @typedef EntryDetail
 * @property {string} id
 * @property {string} meal_occasion
 * @property {string|null} food_id
 * @property {number|null} portion_g
 * @property {string|null} description
 * @property {string|null} photo_storage_path  (raw path in bucket; null if no photo)
 * @property {string|null} photo_signed_url    (resolved signed URL; null if no photo or fetch failed)
 * @property {object|null} components
 * @property {boolean}     ai_scan_used
 * @property {number|null} ai_confidence
 * @property {string|null} ai_reasoning
 */
export async function fetchRecallDetail(sessionId) {
  if (!sessionId) throw new Error('fetchRecallDetail requires a sessionId.');

  // 1. Fetch entries via the user's RLS scope.
  const { data: rawEntries, error } = await supabase
    .from('food_entries')
    .select(
      'id, meal_occasion, food_id, portion_g, description, ' +
      'photo_storage_path, components, ai_scan_used, ai_confidence, ai_reasoning, display_order'
    )
    .eq('session_id', sessionId)
    .order('display_order', { ascending: true });

  if (error) throw error;

  const entries = rawEntries || [];

  // 2. Generate signed URLs for any entries with photos. Run them in parallel —
  // there are typically 0–10 per recall.
  const photoTasks = entries
    .map((e, idx) => ({ idx, path: e.photo_storage_path }))
    .filter(({ path }) => !!path);

  if (photoTasks.length === 0) {
    return {
      entries: entries.map(e => ({ ...e, photo_signed_url: null })),
    };
  }

  // createSignedUrls accepts an array of paths in one call — much more efficient
  // than one call per photo. The result preserves ordering.
  const paths = photoTasks.map(t => t.path);
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (signErr) {
    // Don't fail the whole detail view if signing fails — show entries without photos.
    // eslint-disable-next-line no-console
    console.warn('[recallDetail] Signed URL batch failed:', signErr);
    return {
      entries: entries.map(e => ({ ...e, photo_signed_url: null })),
    };
  }

  // Map signed URLs back to entries by path.
  const urlByPath = new Map();
  (signed || []).forEach((s) => {
    if (s.path && s.signedUrl && !s.error) {
      urlByPath.set(s.path, s.signedUrl);
    }
  });

  return {
    entries: entries.map(e => ({
      ...e,
      photo_signed_url: e.photo_storage_path ? (urlByPath.get(e.photo_storage_path) || null) : null,
    })),
  };
}
