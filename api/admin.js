// =============================================================
// api/admin.js
// Admin-only destructive operations. Two actions:
//
//   1. wipe_all_recalls — delete ALL recall_sessions, food_entries,
//      recall_results, and storage objects in chromadiet-photos
//      across ALL users. Requires confirm='DELETE' in the body.
//
//   2. reseed_demos — wipe Alice & Bob's recalls only, then re-insert
//      the canonical 6 demos (3 days each) with pre-computed scores.
//
// SECURITY:
//   - Caller must present a valid bearer token
//   - Caller's participant row must have role='admin' (or 'staff' — we
//     gate on isStaff in the client; here we re-verify on the server)
//   - SUPABASE_SERVICE_ROLE_KEY is used for the actual mutations so
//     RLS doesn't get in the way of cross-user deletes
//
// CRITICAL: Never trust the client about role. We re-verify against
// the participants table using the user's JWT.
// =============================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { computeAnalysis } from '../src/lib/analysis.js';
import { ALGORITHM_VERSION } from '../src/lib/foodDb.js';
import { DEMO_ACCOUNTS, ALICE_DAYS, BOB_DAYS, buildDemoDates } from './_lib/seedData.js';

const BUCKET = 'chromadiet-photos';

// Same env-loading workaround used in analyze.js / finalize.js
function loadEnv(name) {
  if (process.env[name]) return process.env[name];
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const re = new RegExp('^' + name + '=(.+)$', 'm');
    const match = content.match(re);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  } catch (e) { /* ignore */ }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const supabaseUrl    = loadEnv('VITE_SUPABASE_URL') || loadEnv('SUPABASE_URL');
  const anonKey        = loadEnv('VITE_SUPABASE_ANON_KEY') || loadEnv('SUPABASE_ANON_KEY');
  const serviceRoleKey = loadEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(500).json({
      error: 'Server misconfigured: Supabase env vars missing.',
    });
  }

  // ─── 1. Verify caller is signed in ──────────────────────
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing Authorization bearer token.' });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
  const callerUserId = userData.user.id;

  // ─── 2. Verify caller has admin role ────────────────────
  // Re-check on the server side — never trust the client about role.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profileRow, error: profileErr } = await adminClient
    .from('participants')
    .select('role')
    .eq('user_id', callerUserId)
    .maybeSingle();

  if (profileErr) {
    return res.status(500).json({ error: 'Failed to read caller profile: ' + profileErr.message });
  }

  const role = profileRow?.role;
  const isAdmin = role === 'admin' || role === 'staff';
  if (!isAdmin) {
    return res.status(403).json({ error: 'This action requires admin privileges.' });
  }

  // ─── 3. Dispatch on action ──────────────────────────────
  const { action, confirm } = req.body || {};
  try {
    if (action === 'wipe_all_recalls') {
      // Belt-and-suspenders confirm even after the client typed DELETE.
      if (confirm !== 'DELETE') {
        return res.status(400).json({ error: "Body must include confirm: 'DELETE' for wipe_all_recalls." });
      }
      const result = await wipeAllRecalls(adminClient);
      return res.status(200).json({ ok: true, action, ...result });
    }

    if (action === 'reseed_demos') {
      const result = await reseedDemos(adminClient);
      return res.status(200).json({ ok: true, action, ...result });
    }

    return res.status(400).json({ error: `Unknown action: ${action}. Expected 'wipe_all_recalls' or 'reseed_demos'.` });

  } catch (err) {
    console.error('admin.js error:', err);
    return res.status(500).json({ error: err?.message || 'Unknown error during admin action.' });
  }
}

// ─── Action implementations ────────────────────────────────

async function wipeAllRecalls(adminClient) {
  // Order: storage first (so paths still resolvable), then DB rows.
  // recall_sessions cascade-deletes food_entries and recall_results.

  // Storage cleanup: list all objects in the bucket, delete in batches.
  let storageDeleted = 0;
  const allFiles = await listAllFiles(adminClient, '');
  if (allFiles.length > 0) {
    // Storage API can take an array; we batch in case there are many.
    const BATCH = 100;
    for (let i = 0; i < allFiles.length; i += BATCH) {
      const batch = allFiles.slice(i, i + BATCH);
      const { error } = await adminClient.storage.from(BUCKET).remove(batch);
      if (error) throw new Error(`Storage delete failed at batch ${i}: ${error.message}`);
      storageDeleted += batch.length;
    }
  }

  // DB cleanup: just delete recall_sessions; cascade handles the rest.
  // Use service-role to bypass any RLS edge cases.
  // Note: we delete with a permissive filter (everything), which RLS would
  // normally block — service-role key handles that.
  const { error: sessionsErr, count: sessionsCount } = await adminClient
    .from('recall_sessions')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // sentinel "match all rows"

  if (sessionsErr) throw new Error('recall_sessions delete failed: ' + sessionsErr.message);

  // Verify tables actually empty (safety check — shouldn't be needed but cheap).
  const { count: remainingFood } = await adminClient.from('food_entries').select('*', { count: 'exact', head: true });
  const { count: remainingResults } = await adminClient.from('recall_results').select('*', { count: 'exact', head: true });

  return {
    sessions_deleted: sessionsCount ?? 0,
    photos_deleted: storageDeleted,
    food_entries_remaining: remainingFood ?? 0,
    recall_results_remaining: remainingResults ?? 0,
  };
}

async function reseedDemos(adminClient) {
  // Resolve user_ids for Alice and Bob.
  const aliceId = await resolveUserId(adminClient, DEMO_ACCOUNTS.alice);
  const bobId   = await resolveUserId(adminClient, DEMO_ACCOUNTS.bob);

  if (!aliceId) throw new Error(`Demo account ${DEMO_ACCOUNTS.alice} not found. Create it via the auth dashboard first.`);
  if (!bobId)   throw new Error(`Demo account ${DEMO_ACCOUNTS.bob} not found. Create it via the auth dashboard first.`);

  // Wipe existing recalls for these two accounts.
  const { error: wipeErr } = await adminClient
    .from('recall_sessions')
    .delete()
    .in('user_id', [aliceId, bobId]);
  if (wipeErr) throw new Error('Failed to wipe demo recalls: ' + wipeErr.message);

  // Build the demo dates (today, yesterday, 2 days ago — at 19:30 UTC each).
  const dates = buildDemoDates();

  // Insert each user's days.
  const summary = { alice: [], bob: [] };
  for (const [label, userId, dayList] of [
    ['alice', aliceId, ALICE_DAYS],
    ['bob',   bobId,   BOB_DAYS],
  ]) {
    for (let dayIdx = 0; dayIdx < dayList.length; dayIdx++) {
      const entries = dayList[dayIdx];
      const date    = dates[dayIdx];
      const sessionId = await insertOneDay(adminClient, userId, entries, date);
      const score = await fetchScore(adminClient, sessionId);
      summary[label].push({ day: dayIdx + 1, recallDate: date.recallDate, sessionId, score });
    }
  }

  return {
    alice: { user_id: aliceId, recalls: summary.alice },
    bob:   { user_id: bobId,   recalls: summary.bob },
  };
}

// ─── Helpers ───────────────────────────────────────────────

async function listAllFiles(adminClient, prefix) {
  // Storage `list()` returns folders too — we recurse into them.
  const { data, error } = await adminClient.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`Storage list failed at "${prefix}": ${error.message}`);
  const files = [];
  for (const item of data || []) {
    const childPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      // Folder — recurse.
      files.push(...await listAllFiles(adminClient, childPath));
    } else {
      files.push(childPath);
    }
  }
  return files;
}

async function resolveUserId(adminClient, email) {
  // auth schema isn't normally exposed via PostgREST; we'd need an RPC for it.
  // But participants has a 1:1 with auth.users, and we know participants includes
  // user_id and we can match... wait, we don't store email on participants.
  // Use the admin client's auth API instead.
  const { data, error } = await adminClient.auth.admin.listUsers();
  if (error) throw new Error('Failed to list users: ' + error.message);
  const found = (data?.users || []).find(u => u.email === email);
  return found?.id || null;
}

async function insertOneDay(adminClient, userId, entries, date) {
  // 1. Create the session.
  const { data: sessionRow, error: sessErr } = await adminClient
    .from('recall_sessions')
    .insert({
      user_id: userId,
      recall_date: date.recallDate,
      status: 'submitted',
      submitted_at: date.submittedAt,
      notes: null,
    })
    .select('id')
    .single();
  if (sessErr) throw new Error('Session insert failed: ' + sessErr.message);
  const sessionId = sessionRow.id;

  // 2. Insert food_entries.
  const rows = entries.map((e, idx) => ({
    session_id: sessionId,
    user_id: userId,
    meal_occasion: e.meal,
    food_id: e.foodId,
    portion_g: e.portionG,
    description: null,
    photo_storage_path: null,
    ai_scan_used: false,
    components: null,
    display_order: idx,
  }));
  const { error: entriesErr } = await adminClient.from('food_entries').insert(rows);
  if (entriesErr) throw new Error('Entries insert failed: ' + entriesErr.message);

  // 3. Compute analysis using the canonical algorithm and insert recall_results.
  const shapedEntries = entries.map(e => ({
    foodId: e.foodId, portionG: e.portionG, meal: e.meal, components: null,
  }));
  const analysis = computeAnalysis(shapedEntries);

  const { error: resultsErr } = await adminClient.from('recall_results').insert({
    session_id:           sessionId,
    user_id:              userId,
    total_score:          analysis.totalScore,
    total_flavonoids_mg:  Number(analysis.totalMg.toFixed(2)),
    classes_present:      analysis.classesPresent,
    colors_present:       analysis.colorsPresent,
    myplate_groups_hit:   analysis.myplateGroupsHit,
    flav_totals:          analysis.flavTotals,
    color_pigment_mg:     analysis.colorPigmentMg,
    myplate_counts:       analysis.myplateCounts,
    fruit_count:          analysis.fruitCount,
    veg_count:            analysis.vegCount,
    fruit_color_counts:   analysis.fruitColorCounts,
    veg_color_counts:     analysis.vegColorCounts,
    sources:              analysis.sources,
    sufficiency:          analysis.sufficiency,
    score_breakdown:      analysis.breakdown,
    algorithm_version:    ALGORITHM_VERSION,
    computed_at:          date.submittedAt,
  });
  if (resultsErr) throw new Error('Results insert failed: ' + resultsErr.message);

  return sessionId;
}

async function fetchScore(adminClient, sessionId) {
  const { data } = await adminClient
    .from('recall_results')
    .select('total_score')
    .eq('session_id', sessionId)
    .maybeSingle();
  return data?.total_score ?? null;
}
