// =============================================================
// src/lib/adminActions.js
// Client wrapper for /api/admin endpoint.
// Used by AdminTab.jsx — no other component should call this.
// =============================================================

import { supabase } from './supabase';

async function callAdmin(body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not signed in.');
  }

  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  // Try to parse JSON regardless of status — server returns JSON for both
  // success and error paths. Fall back to status text if response isn't JSON.
  let parsed;
  try {
    parsed = await res.json();
  } catch (parseErr) {
    throw new Error(`Server returned non-JSON (status ${res.status}).`);
  }

  if (!res.ok) {
    throw new Error(parsed.error || `Server returned ${res.status}.`);
  }
  return parsed;
}

/**
 * Wipe ALL recall data across all users. Requires explicit DELETE confirmation.
 * Server also re-validates the caller has admin role; this client check
 * is just a guardrail.
 *
 * @param {string} confirmText — must be the literal string 'DELETE'
 * @returns {Promise<{sessions_deleted, photos_deleted, ...}>}
 */
export async function wipeAllRecalls(confirmText) {
  if (confirmText !== 'DELETE') {
    throw new Error('Must pass DELETE as confirmation text.');
  }
  return await callAdmin({ action: 'wipe_all_recalls', confirm: 'DELETE' });
}

/**
 * Re-seed the demo accounts. Wipes Alice and Bob's existing recalls and
 * inserts the canonical 6 demos (3 days each) with pre-computed scores.
 * Idempotent — safe to run multiple times.
 *
 * @returns {Promise<{alice, bob}>} Summary of what was inserted per account.
 */
export async function reseedDemos() {
  return await callAdmin({ action: 'reseed_demos' });
}
