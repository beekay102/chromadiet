// =============================================================
// src/components/AdminTab.jsx
// Admin-only operations tab. Visible to users with role='admin'
// (gated upstream in ChromaDiet.jsx; this component itself just
// renders — it doesn't re-check the role).
//
// Two destructive actions:
//   1. Wipe ALL recall data — requires typing DELETE
//   2. Re-seed demo accounts — one click, idempotent
// =============================================================

import React, { useState } from 'react';
import { wipeAllRecalls, reseedDemos } from '../lib/adminActions';
import { AlertTriangle, RefreshCw, CheckCircle2, AlertCircle, Trash2, Sparkles } from 'lucide-react';

export default function AdminTab({ onAfterMutation }) {
  return (
    <div>
      <div className="mb-10 pb-6 border-b border-stone-200">
        <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Admin · Destructive operations</div>
        <h2 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-semibold text-stone-900 mt-1">
          Admin tools.
        </h2>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Server-side actions that affect data across all participants. These run with
          service-role privileges; the server re-verifies your admin role before each call.
          Use with care — wipe is irreversible.
        </p>
      </div>

      <div className="space-y-5">
        <ReseedCard onAfterMutation={onAfterMutation} />
        <WipeCard   onAfterMutation={onAfterMutation} />
      </div>
    </div>
  );
}

// ─── Re-seed Demos ─────────────────────────────────────────

function ReseedCard({ onAfterMutation }) {
  const [state, setState] = useState({ status: 'idle', error: null, result: null });

  const onClick = async () => {
    setState({ status: 'running', error: null, result: null });
    try {
      const result = await reseedDemos();
      setState({ status: 'done', error: null, result });
      if (typeof onAfterMutation === 'function') onAfterMutation();
    } catch (e) {
      setState({ status: 'error', error: e.message || 'Re-seed failed.', result: null });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200/70 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700">
            <Sparkles size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-semibold text-stone-900">Re-seed demo accounts</h3>
            <p className="text-sm text-stone-600 mt-1">
              Wipes existing recalls for <code className="text-xs bg-stone-100 px-1 rounded">demo-alice@chromadiet.app</code> and{' '}
              <code className="text-xs bg-stone-100 px-1 rounded">demo-bob@chromadiet.app</code>, then inserts the canonical
              6 demo recalls (3 days each, pre-computed scores). Idempotent — safe to re-run.
            </p>
          </div>
          <button
            onClick={onClick}
            disabled={state.status === 'running'}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-purple-700 text-white hover:bg-purple-800 transition disabled:opacity-60 disabled:cursor-wait"
          >
            {state.status === 'running' && <RefreshCw size={14} className="animate-spin" />}
            {state.status === 'running' ? 'Re-seeding…' : 'Re-seed demos'}
          </button>
        </div>
      </div>

      {state.status === 'done' && state.result && (
        <div className="px-6 py-3 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-900">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Re-seed complete.</div>
              <div className="mt-1 space-y-0.5">
                <div>Alice: {state.result.alice.recalls.map(r => `Day ${r.day}=${r.score}`).join(', ')}</div>
                <div>Bob: {state.result.bob.recalls.map(r => `Day ${r.day}=${r.score}`).join(', ')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="px-6 py-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-900">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{state.error}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Wipe All Recalls ──────────────────────────────────────

function WipeCard({ onAfterMutation }) {
  const [confirmText, setConfirmText] = useState('');
  const [state, setState] = useState({ status: 'idle', error: null, result: null });

  const canWipe = confirmText === 'DELETE' && state.status !== 'running';

  const onClick = async () => {
    if (!canWipe) return;
    setState({ status: 'running', error: null, result: null });
    try {
      const result = await wipeAllRecalls('DELETE');
      setState({ status: 'done', error: null, result });
      setConfirmText(''); // reset confirmation field
      if (typeof onAfterMutation === 'function') onAfterMutation();
    } catch (e) {
      setState({ status: 'error', error: e.message || 'Wipe failed.', result: null });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-rose-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 text-rose-700">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 style={{ fontFamily: 'Fraunces, serif' }} className="text-lg font-semibold text-stone-900">Wipe ALL recall data</h3>
            <p className="text-sm text-stone-600 mt-1">
              Deletes every <code className="text-xs bg-stone-100 px-1 rounded">recall_session</code>,{' '}
              <code className="text-xs bg-stone-100 px-1 rounded">food_entry</code>,{' '}
              <code className="text-xs bg-stone-100 px-1 rounded">recall_result</code>, and storage object across <strong>all participants</strong>.
              <br />
              <strong className="text-rose-700">This action is irreversible.</strong> User accounts and demographics are preserved.
            </p>

            <div className="mt-4">
              <label className="block text-xs text-stone-700 mb-1.5 font-medium">
                Type <code className="text-rose-700 font-bold">DELETE</code> to enable the wipe button:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={state.status === 'running'}
                className="px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg w-48 font-mono focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-500 disabled:bg-stone-50"
              />
            </div>
          </div>
          <button
            onClick={onClick}
            disabled={!canWipe}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-rose-700 text-white hover:bg-rose-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {state.status === 'running' && <RefreshCw size={14} className="animate-spin" />}
            <Trash2 size={14} />
            {state.status === 'running' ? 'Wiping…' : 'Wipe all recalls'}
          </button>
        </div>
      </div>

      {state.status === 'done' && state.result && (
        <div className="px-6 py-3 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-900">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Wipe complete.</div>
              <div className="mt-1 space-y-0.5">
                <div>{state.result.sessions_deleted} sessions deleted (cascaded to entries + results)</div>
                <div>{state.result.photos_deleted} photos deleted from storage</div>
                {(state.result.food_entries_remaining > 0 || state.result.recall_results_remaining > 0) && (
                  <div className="text-amber-700">
                    Note: {state.result.food_entries_remaining} food_entries / {state.result.recall_results_remaining} recall_results
                    rows still present (cascade may have missed something — check Supabase).
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="px-6 py-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-900">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{state.error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
