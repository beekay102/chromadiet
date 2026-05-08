// =============================================================
// src/components/MyHistoryTab.jsx
// "My History" tab — shown to all users (participants see their
// own; researchers/admins see their own here too, the cohort-wide
// view lives in CohortViewTab).
// =============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { fetchRecallHistory, PAGE_SIZE } from '../lib/recallHistory';
import { RefreshCw, AlertCircle, ChevronRight, Inbox } from 'lucide-react';

export default function MyHistoryTab({ refreshSignal, onJumpToIntake, isStaff = false }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Load the first page (replacing any prior data). Used on mount, refresh,
  // and after a successful submit (via refreshSignal).
  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { rows: r, totalCount: t, hasMore: h } = await fetchRecallHistory({ page: 0 });
      setRows(r);
      setTotalCount(t);
      setHasMore(h);
      setPage(0);
    } catch (err) {
      setError(err?.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const next = page + 1;
      const { rows: r, hasMore: h } = await fetchRecallHistory({ page: next });
      setRows((prev) => [...prev, ...r]);
      setHasMore(h);
      setPage(next);
    } catch (err) {
      setError(err?.message || 'Failed to load more.');
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  // Initial load + react to external refresh signal (incremented after submit).
  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage, refreshSignal]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Phase 01 · Submitted recalls</div>
          <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-semibold text-stone-900 mt-1">
            {isStaff ? 'All participants — history' : 'My history'}
          </h2>
        </div>
        <button
          onClick={loadFirstPage}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition disabled:opacity-50"
          title="Refresh history"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="text-center py-16 text-sm text-stone-500">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState onJumpToIntake={onJumpToIntake} isStaff={isStaff} />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-stone-200/70 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase text-stone-500 font-medium">Submitted</th>
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase text-stone-500 font-medium">Cohort</th>
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase text-stone-500 font-medium">Entries</th>
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase text-stone-500 font-medium">Score</th>
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase text-stone-500 font-medium">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <HistoryRow key={r.session_id} row={r} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-stone-500">
            <div>
              Showing <strong>{rows.length}</strong> of <strong>{totalCount}</strong> recall{totalCount === 1 ? '' : 's'}
            </div>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-emerald-700 text-emerald-700 hover:bg-emerald-700 hover:text-white transition disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : `Load ${Math.min(PAGE_SIZE, totalCount - rows.length)} more`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function HistoryRow({ row }) {
  const submitted = row.submitted_at ? new Date(row.submitted_at) : null;
  const dateStr = submitted ? submitted.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }) : '—';

  return (
    <tr className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50/50">
      <td className="px-4 py-3 text-stone-800">{dateStr}</td>
      <td className="px-4 py-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {row.cohort_code || <span className="text-stone-400">—</span>}
      </td>
      <td className="px-4 py-3 text-stone-700">
        {row.entry_count ?? <span className="text-stone-400">—</span>}
      </td>
      <td className="px-4 py-3 text-stone-700">
        {typeof row.score === 'number' ? row.score.toFixed(1) : <span className="text-stone-400">—</span>}
      </td>
      <td className="px-4 py-3">
        <StatusPill status={row.status} />
      </td>
      <td className="px-4 py-3 text-right">
        {/* Detail view is a Phase 4 nice-to-have; for now this is decorative. */}
        <ChevronRight className="w-4 h-4 text-stone-300" />
      </td>
    </tr>
  );
}

function StatusPill({ status }) {
  const styles = {
    submitted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    reviewed:  'bg-blue-50 text-blue-800 border-blue-200',
    archived:  'bg-stone-100 text-stone-600 border-stone-200',
    draft:     'bg-amber-50 text-amber-800 border-amber-200',
  };
  const cls = styles[status] || 'bg-stone-100 text-stone-600 border-stone-200';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wider uppercase border ${cls}`}>
      {status || 'unknown'}
    </span>
  );
}

function EmptyState({ onJumpToIntake, isStaff }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-stone-100 mb-4">
        <Inbox className="w-6 h-6 text-stone-400" />
      </div>
      <p style={{ fontFamily: 'Fraunces, serif' }} className="text-xl text-stone-700 mb-2">
        {isStaff ? 'No participant submissions yet.' : 'No history yet.'}
      </p>
      <p className="text-sm text-stone-500 mb-5 max-w-sm mx-auto">
        {isStaff
          ? 'Once participants submit their 24-hour recalls, they will appear here.'
          : 'Submit your first intake entry!'}
      </p>
      {onJumpToIntake && !isStaff && (
        <button
          onClick={onJumpToIntake}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition shadow-sm"
        >
          Log a recall →
        </button>
      )}
    </div>
  );
}
