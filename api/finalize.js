// =============================================================
// api/finalize.js
// Vercel serverless function. Computes the ChromaDiet analysis
// for a submitted recall session and writes the result to
// recall_results.
//
// FLOW:
//   1. Auth: validate the user's bearer token from the request header
//   2. Authz: confirm the user owns the session (or is staff)
//   3. Fetch food_entries for the session
//   4. Run computeAnalysis() — same algorithm the client uses
//   5. Upsert into recall_results using the service-role key
//      (RLS denies user-side INSERT; we use service-role to bypass)
//
// SECURITY NOTES:
//   - SUPABASE_SERVICE_ROLE_KEY is read from env. NEVER exposed client-side.
//   - The user's bearer token is validated before we trust their claim
//     about session ownership. We don't trust user-supplied data.
//   - Even with service-role key, we still scope our queries to the
//     specific sessionId the user authenticated against.
// =============================================================

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { computeAnalysis } from '../src/lib/analysis.js';
import { ALGORITHM_VERSION } from '../src/lib/foodDb.js';

// Workaround: vercel dev sometimes fails to inject env vars into functions.
// Read .env.local directly as a fallback. In production on Vercel.com,
// process.env values are set correctly and this fallback never runs.
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
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const supabaseUrl     = loadEnv('VITE_SUPABASE_URL') || loadEnv('SUPABASE_URL');
  const anonKey         = loadEnv('VITE_SUPABASE_ANON_KEY') || loadEnv('SUPABASE_ANON_KEY');
  const serviceRoleKey  = loadEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(500).json({
      error: 'Server misconfigured: Supabase env vars missing.',
      hint: 'Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  // ── 1. Authenticate the caller ──────────────────────────
  // The client passes its session JWT in the Authorization header.
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization bearer token.' });
  }

  // Use the anon key + provided JWT to verify the user. createClient with
  // the user's JWT means subsequent queries are scoped to their RLS.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
  const userId = userData.user.id;

  // ── 2. Validate request body ────────────────────────────
  const { sessionId } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Request body must include a string sessionId.' });
  }

  try {
    // ── 3. Confirm session ownership ──────────────────────
    // Query through the user's RLS scope. If the user doesn't own this
    // session (and isn't staff), the row won't be returned.
    const { data: sessionRow, error: sessErr } = await userClient
      .from('recall_sessions')
      .select('id, user_id, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessErr) {
      return res.status(500).json({ error: 'Failed to verify session: ' + sessErr.message });
    }
    if (!sessionRow) {
      return res.status(403).json({ error: 'Session not found or not accessible.' });
    }

    // ── 4. Fetch food_entries for the session ─────────────
    const { data: entries, error: entriesErr } = await userClient
      .from('food_entries')
      .select('food_id, portion_g, meal_occasion, components, display_order')
      .eq('session_id', sessionId)
      .order('display_order', { ascending: true });

    if (entriesErr) {
      return res.status(500).json({ error: 'Failed to fetch entries: ' + entriesErr.message });
    }
    if (!entries || entries.length === 0) {
      return res.status(400).json({ error: 'Session has no food entries to analyze.' });
    }

    // Re-shape DB rows into the entry shape computeAnalysis expects.
    // computeAnalysis takes { foodId, portionG, meal, components } camelCase.
    const shapedEntries = entries.map(e => ({
      foodId: e.food_id,
      portionG: e.portion_g,
      meal: e.meal_occasion,
      components: e.components,
    }));

    // ── 5. Run analysis ───────────────────────────────────
    const analysis = computeAnalysis(shapedEntries);

    // ── 6. Upsert recall_results using service-role key ───
    // We use a separate admin client so the INSERT can bypass RLS
    // (recall_results denies user-side INSERTs by design).
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const resultsRow = {
      session_id:           sessionId,
      user_id:              sessionRow.user_id,
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
      computed_at:          new Date().toISOString(),
    };

    const { error: upsertErr } = await adminClient
      .from('recall_results')
      .upsert(resultsRow, { onConflict: 'session_id' });

    if (upsertErr) {
      return res.status(500).json({ error: 'Failed to write results: ' + upsertErr.message });
    }

    return res.status(200).json({
      ok: true,
      sessionId,
      totalScore: analysis.totalScore,
      algorithmVersion: ALGORITHM_VERSION,
    });

  } catch (err) {
    console.error('finalize.js error:', err);
    return res.status(500).json({
      error: err?.message || 'Unknown error during finalize.',
    });
  }
}
