// =============================================================
// src/components/CohortViewTab.jsx
// Researcher/admin-only Cohort View tab.
//
// Reads my_recall_history (which now JOINs participants — see
// sql/04_extend_my_recall_history.sql) and reuses the visual
// patterns from the original localStorage-backed cohort UI:
//
//   - Sub-group filter (age range / sex / cohort code)
//   - Mean stats cards (participants, mean score, mean total flavonoids)
//   - NHANES vs cohort comparison bar chart
//
// Notes on data sourcing:
//   - my_recall_history exposes flav_totals as JSONB, with the same
//     six-class structure ChromaDiet uses internally.
//   - "Participants" count means distinct user_ids in the filtered
//     result, not row count (since one user may have multiple recalls).
//   - The existing cohort UI computed means across submissions; we
//     keep that semantic (per-recall mean, not per-participant) for
//     consistency with how the original analysis was framed.
// =============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { RefreshCw, AlertCircle, Filter, Users } from 'lucide-react';

// Mirrors FLAVONOID_CLASSES + NHANES_MEAN constants from ChromaDiet.jsx.
// Kept as a small local copy so this component is self-contained; if the
// canonical lists ever change, update both places (or extract them to a
// shared constants module).
const FLAVONOID_CLASSES = {
  anthocyanidins: { label: 'Anthocyanidins' },
  flavan3ols:     { label: 'Flavan-3-ols' },
  flavanones:     { label: 'Flavanones' },
  flavones:       { label: 'Flavones' },
  flavonols:      { label: 'Flavonols' },
  isoflavones:    { label: 'Isoflavones' },
};
const NHANES_MEAN = {
  anthocyanidins: 11.6,
  flavan3ols:     156.5,
  flavanones:     14.4,
  flavones:       1.6,
  flavonols:      13.3,
  isoflavones:    1.3,
};

export default function CohortViewTab({ refreshSignal }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState({
    ageRange: 'all',
    sex: 'all',
    cohortCode: 'all',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Pull a generous chunk in one shot. Research studies won't have
      // millions of recalls, and the cohort view is admin-only so we're
      // not worried about hammering the DB. Bump if you hit the cap.
      const { data, error: err } = await supabase
        .from('my_recall_history')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(2000);

      if (err) throw err;
      setRows(data || []);
    } catch (e) {
      setError(e?.message || 'Failed to load cohort data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  // Filter dropdown options derived from the rows we have.
  const filterOptions = useMemo(() => {
    const ageRanges = new Set();
    const sexes = new Set();
    const cohortCodes = new Set();
    for (const r of rows) {
      if (r.age_range) ageRanges.add(r.age_range);
      if (r.sex) sexes.add(r.sex);
      if (r.cohort_code) cohortCodes.add(r.cohort_code);
    }
    const sort = (s) => Array.from(s).sort();
    return {
      ageRanges:   ['all', ...sort(ageRanges)],
      sexes:       ['all', ...sort(sexes)],
      cohortCodes: ['all', ...sort(cohortCodes)],
    };
  }, [rows]);

  const filteredRows = useMemo(() => rows.filter((r) => {
    if (filter.ageRange   !== 'all' && r.age_range   !== filter.ageRange)   return false;
    if (filter.sex        !== 'all' && r.sex        !== filter.sex)        return false;
    if (filter.cohortCode !== 'all' && r.cohort_code !== filter.cohortCode) return false;
    return true;
  }), [rows, filter]);

  // Cohort statistics — distinct participants, mean score, per-class means.
  const stats = useMemo(() => {
    if (filteredRows.length === 0) return null;

    const distinctUsers = new Set(filteredRows.map((r) => r.user_id));

    // Filter out NULLs before averaging — sessions submitted but not yet
    // finalized by /api/finalize have total_score=null. We don't want them
    // counted as zero (which would drag the mean down).
    const scores = filteredRows
      .filter((r) => r.total_score !== null && r.total_score !== undefined)
      .map((r) => Number(r.total_score))
      .filter((n) => Number.isFinite(n));
    const meanScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const totalMgs = filteredRows
      .filter((r) => r.total_flavonoids_mg !== null && r.total_flavonoids_mg !== undefined)
      .map((r) => Number(r.total_flavonoids_mg))
      .filter((n) => Number.isFinite(n));
    const meanTotalMg = totalMgs.length ? totalMgs.reduce((a, b) => a + b, 0) / totalMgs.length : 0;

    // Per-class flavonoid means. flav_totals is JSONB on each row; null when
    // the row hasn't been finalized yet (we filter those out per-class).
    const classMeans = {};
    for (const k of Object.keys(FLAVONOID_CLASSES)) {
      const vals = filteredRows
        .filter((r) => r.flav_totals && typeof r.flav_totals === 'object')
        .map((r) => Number(r.flav_totals[k]))
        .filter((n) => Number.isFinite(n));
      classMeans[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    return {
      n: distinctUsers.size,
      submissions: filteredRows.length,
      submissionsWithResults: scores.length,    // rows that have a finalized score
      meanScore,
      meanTotalMg,
      classMeans,
    };
  }, [filteredRows]);

  return (
    <div>
      {/* Heading mirrors the original cohort tab's SectionHeading style. */}
      <div className="mb-10 pb-6 border-b border-stone-200">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Aggregate · All Participants</div>
            <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-semibold text-stone-900 mt-1">
              Cohort intake patterns.
            </h2>
            <p className="text-sm text-stone-600 mt-2 max-w-2xl">
              Aggregated data from all submissions in the database. Filter by demographic sub-group below.
              Per-row demographics come from the <code className="text-xs bg-stone-100 px-1 rounded">participants</code> table
              joined into the <code className="text-xs bg-stone-100 px-1 rounded">my_recall_history</code> view.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-5">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Sub-group filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 p-5 mb-5">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3">
          <Filter size={12} /> Sub-group filter
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FilterSelect label="Age range"  value={filter.ageRange}   options={filterOptions.ageRanges}
            onChange={(v) => setFilter({ ...filter, ageRange:   v })} />
          <FilterSelect label="Sex"        value={filter.sex}        options={filterOptions.sexes}
            onChange={(v) => setFilter({ ...filter, sex:        v })} />
          <FilterSelect label="Cohort code" value={filter.cohortCode} options={filterOptions.cohortCodes}
            onChange={(v) => setFilter({ ...filter, cohortCode: v })} />
        </div>
        <div className="text-xs text-stone-500 mt-3">
          {filteredRows.length} of {rows.length} submissions match the current filter.
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="text-stone-500 text-sm text-center py-12">Loading cohort data…</div>
      ) : !stats ? (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 p-12 text-center">
          <Users size={32} strokeWidth={1.2} className="mx-auto text-stone-400 mb-4" />
          <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl mb-2 font-medium">
            {rows.length === 0 ? 'No submissions yet' : 'No matches for this filter'}
          </div>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            {rows.length === 0
              ? 'Once participants submit their 24-hour recalls, aggregate statistics will appear here.'
              : 'Try widening the sub-group filter above.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <StatCard
              accent="#7B3F9E"
              label="Participants"
              value={stats.n}
              hint={
                stats.submissionsWithResults < stats.submissions
                  ? `${stats.submissionsWithResults} of ${stats.submissions} submissions analyzed`
                  : `${stats.submissions} submission${stats.submissions === 1 ? '' : 's'}`
              }
            />
            <StatCard
              accent="#5B8C3E"
              label="Mean ChromaDiet Score"
              value={<>{stats.meanScore.toFixed(1)}<span className="text-xl text-stone-400">/100</span></>}
            />
            <StatCard
              accent="#E89422"
              label="Mean Total Flavonoids"
              value={<>{stats.meanTotalMg.toFixed(0)}<span className="text-xl text-stone-400">mg</span></>}
            />
          </div>

          {/* NHANES comparison */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 p-6">
            <div className="mb-4">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Figure 7 · Cohort vs. NHANES</div>
              <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-xl text-stone-900 mt-1">
                Mean intake by flavonoid class
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Filtered cohort means (purple) compared to NHANES 2007–2008 U.S. adult means (gray).
              </p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={Object.keys(FLAVONOID_CLASSES).map((k) => ({
                name: FLAVONOID_CLASSES[k].label,
                Cohort: Number(stats.classMeans[k].toFixed(2)),
                NHANES: NHANES_MEAN[k],
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e9dc" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'mg/day', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Cohort" fill="#7B3F9E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NHANES" fill="#a8a29e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="block text-xs text-stone-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-stone-300 px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === 'all' ? 'All' : o}</option>
        ))}
      </select>
    </div>
  );
}

function StatCard({ label, value, hint, accent }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 p-6" style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
      <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">{label}</div>
      <div style={{ fontFamily: 'Fraunces, serif' }} className="text-5xl font-medium mt-2 text-stone-900">
        {value}
      </div>
      {hint && <div className="text-xs text-stone-600 mt-2">{hint}</div>}
    </div>
  );
}
