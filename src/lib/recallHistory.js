// =============================================================
// src/lib/recallHistory.js
// Data access layer for the my_recall_history view.
//
// RLS does the heavy lifting: when a participant queries this
// view they get only their own rows; when a researcher/admin
// queries it they get everyone's. We don't have to filter by
// user_id in the client.
//
// ASSUMED COLUMN SHAPE — verify against your Phase 1 view:
//   session_id           UUID         (primary key of recall_sessions)
//   user_id              UUID
//   participant_code     TEXT         ('P-XXXXXX')
//   cohort_code          TEXT         (nullable)
//   age_range            TEXT
//   sex                  TEXT
//   is_demo              BOOLEAN
//   submitted_at         TIMESTAMPTZ
//   status               TEXT         ('submitted' | 'reviewed' | 'archived')
//   entry_count          INT          (count of food_entries on session)
//   score                NUMERIC      (from recall_results, may be null)
//   color_coverage       NUMERIC      (from recall_results, may be null)
//   ...possibly others — adjust UI fields if names differ.
// =============================================================

import { supabase } from './supabase';

const PAGE_SIZE = 20;

/**
 * Fetch a page of recall history.
 *
 * @param {object} opts
 * @param {number} opts.page              0-based page index
 * @param {string|null} opts.cohortCode   filter by exact cohort code, or null for all
 * @returns {Promise<{rows, totalCount, hasMore}>}
 */
export async function fetchRecallHistory({ page = 0, cohortCode = null } = {}) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('my_recall_history')
    .select('*', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(from, to);

  if (cohortCode) {
    query = query.eq('cohort_code', cohortCode);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: data || [],
    totalCount: count ?? 0,
    hasMore: (count ?? 0) > to + 1,
  };
}

/**
 * Fetch the distinct list of cohort codes the current user can see.
 * Used to populate the cohort filter dropdown in the researcher view.
 *
 * Returns an array of strings, e.g. ['DEMO', 'STUDY-2026', null].
 * Includes null if any rows have no cohort code assigned.
 */
export async function fetchDistinctCohorts() {
  // Supabase doesn't expose SELECT DISTINCT directly through PostgREST.
  // Workaround: fetch all cohort_code values (cap at 1000 — research
  // studies won't have anywhere close) and dedupe client-side.
  // If the cohort list ever grows large, replace this with a database
  // view or RPC that does SELECT DISTINCT cohort_code FROM my_recall_history.
  const { data, error } = await supabase
    .from('my_recall_history')
    .select('cohort_code')
    .limit(1000);

  if (error) throw error;

  const seen = new Set();
  const cohorts = [];
  for (const row of data || []) {
    const c = row.cohort_code ?? null;
    const key = c ?? '__null__';
    if (!seen.has(key)) {
      seen.add(key);
      cohorts.push(c);
    }
  }

  // Sort: real cohorts alphabetically, null last
  return cohorts.sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a.localeCompare(b);
  });
}

export { PAGE_SIZE };
