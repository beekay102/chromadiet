// =============================================================
// src/lib/photoUpload.js
// Photo handling utilities for the recall submission flow.
//
// The intake form stores photos as data URLs (base64) in entry state.
// At submit time we:
//   1. Convert each data URL to a Blob
//   2. If the Blob is > 10 MB (the Supabase bucket limit), compress
//      it client-side via canvas re-encode until it fits
//   3. Upload to Supabase Storage at `{user_id}/{session_id}/{idx}.jpg`
//   4. Return the storage path so the food_entries row can reference it
//
// We never reject photos client-side — anything the user gave us, we
// make fit. The 10 MB cap is the storage bucket's setting from Phase 1.
// =============================================================

import { supabase } from './supabase';

const BUCKET = 'chromadiet-photos';
const BUCKET_LIMIT_BYTES = 10 * 1024 * 1024; // matches Phase 1 bucket config

// Compression knobs for the iterative-shrink loop.
// First pass: keep dimensions, drop quality to 0.85.
// Subsequent passes: scale down by 25% until it fits or we bottom out.
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;
const MAX_DIMENSION = 2560;     // long-edge cap for aggressive shrinks
const MIN_DIMENSION = 800;      // don't shrink past this — quality floor

/**
 * Upload one photo to storage. Compresses if necessary.
 *
 * @param {object} opts
 * @param {string} opts.dataUrl    The data URL from the intake form (entry.photo).
 * @param {string} opts.userId     auth.uid() — used as top-level folder.
 * @param {string} opts.sessionId  Recall session UUID.
 * @param {number} opts.index      Entry index within the session (0-based).
 *                                 Used for stable filename ordering.
 *
 * @returns {Promise<{path: string, size: number, compressed: boolean}>}
 *
 * @throws {Error} On upload or compression failure. Message is human-readable.
 */
export async function uploadPhoto({ dataUrl, userId, sessionId, index }) {
  if (!dataUrl) throw new Error('No photo data provided.');
  if (!userId || !sessionId) throw new Error('Missing user or session id.');

  let blob = await dataUrlToBlob(dataUrl);
  let compressed = false;

  if (blob.size > BUCKET_LIMIT_BYTES) {
    const compressedBlob = await compressBlob(blob);
    blob = compressedBlob;
    compressed = true;
  }

  // Pick extension from the (final) blob's MIME type.
  const ext = mimeToExt(blob.type);
  const path = `${userId}/${sessionId}/${index}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: blob.type,
      cacheControl: '3600',
      upsert: false, // session_id is unique per submission, no collisions expected
    });

  if (uploadErr) {
    throw new Error(`Photo ${index + 1} upload failed: ${uploadErr.message}`);
  }

  return { path, size: blob.size, compressed };
}

/**
 * Delete a list of storage paths. Used during cleanup after a failed submission.
 * Errors are swallowed (logged only) — cleanup failure shouldn't mask the
 * original submission error the user is trying to debug.
 */
export async function deletePhotos(paths) {
  if (!paths || paths.length === 0) return;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[photoUpload] Cleanup delete failed:', error);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[photoUpload] Cleanup delete threw:', err);
  }
}

// ─── Internal helpers ──────────────────────────────────────────

/**
 * Convert a data URL (data:image/jpeg;base64,...) into a Blob.
 * Done via fetch() so the runtime handles base64 decoding for us.
 */
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

/**
 * Compress a Blob via <canvas> re-encode. Iteratively reduces quality and
 * dimensions until the result fits the bucket limit, or we hit the floor.
 */
async function compressBlob(blob) {
  const img = await blobToImage(blob);

  let { width, height } = img;
  let quality = INITIAL_QUALITY;

  // Cap the long edge first if the source is huge. Phone photos at 12+ MP
  // can be 4000+ px on a side — 2560 is plenty for a food log.
  const longEdge = Math.max(width, height);
  if (longEdge > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longEdge;
    width  = Math.round(width  * scale);
    height = Math.round(height * scale);
  }

  // Iterative shrink loop. Up to ~6 passes:
  //   Pass 1: dimensions capped, quality 0.85
  //   Pass 2: shrink 25%, quality 0.85
  //   Pass 3: shrink 25%, quality 0.75
  //   Pass 4+: continue shrinking & dropping quality until floor
  for (let attempt = 0; attempt < 6; attempt++) {
    const out = await canvasEncode(img, width, height, quality);
    if (out.size <= BUCKET_LIMIT_BYTES) return out;

    if (Math.max(width, height) > MIN_DIMENSION) {
      width  = Math.round(width  * 0.75);
      height = Math.round(height * 0.75);
    }
    if (quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.1);
    }
  }

  // If we get here, the photo was extreme. Return the smallest version we
  // produced anyway — caller will surface the bucket's reject error if it's
  // still too big, but at this point the photo is unusable.
  return await canvasEncode(img, width, height, MIN_QUALITY);
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image for compression.'));
    };
    img.src = url;
  });
}

function canvasEncode(img, width, height, quality) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas 2D context unavailable.'));
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas encoding failed.')),
      'image/jpeg',
      quality
    );
  });
}

function mimeToExt(mime) {
  switch ((mime || '').toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'jpg'; // canvas always re-encodes as jpeg, so this is the safe default
  }
}
