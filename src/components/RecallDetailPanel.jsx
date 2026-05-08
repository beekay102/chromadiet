// =============================================================
// src/components/RecallDetailPanel.jsx
// Inline expansion shown below a history row when clicked.
// Lists each food entry with portion, meal, food name, and a photo
// thumbnail (if present, signed URL with 1-hour TTL).
// =============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { fetchRecallDetail } from '../lib/recallDetail';
import { findFoodById, COLOR_CATEGORIES } from '../lib/foodDb.js';
import { Camera, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';

export default function RecallDetailPanel({ sessionId }) {
  const [state, setState] = useState({ loading: true, error: null, entries: null });

  const load = useCallback(async () => {
    setState({ loading: true, error: null, entries: null });
    try {
      const { entries } = await fetchRecallDetail(sessionId);
      setState({ loading: false, error: null, entries });
    } catch (e) {
      setState({ loading: false, error: e?.message || 'Failed to load detail.', entries: null });
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  if (state.loading) {
    return (
      <div className="px-4 py-6 bg-stone-50/50 border-l-4 border-emerald-200">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading entries…
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="px-4 py-4 bg-rose-50/50 border-l-4 border-rose-200">
        <div className="flex items-start gap-2 text-sm text-rose-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div>{state.error}</div>
            <button onClick={load} className="text-xs text-rose-700 underline mt-1">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const entries = state.entries || [];
  if (entries.length === 0) {
    return (
      <div className="px-4 py-6 bg-stone-50/50 border-l-4 border-emerald-200 text-sm text-stone-500">
        No food entries on this recall.
      </div>
    );
  }

  // Group by meal so the visual structure mirrors the intake form.
  const groups = groupByMeal(entries);
  const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'];

  return (
    <div className="px-4 py-5 bg-stone-50/50 border-l-4 border-emerald-200 space-y-5">
      {mealOrder
        .filter(meal => groups[meal] && groups[meal].length > 0)
        .map(meal => (
          <div key={meal}>
            <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-2">
              {meal}
            </div>
            <div className="space-y-2">
              {groups[meal].map(entry => <EntryRow key={entry.id} entry={entry} />)}
            </div>
          </div>
        ))}
    </div>
  );
}

function EntryRow({ entry }) {
  const food = findFoodById(entry.food_id);
  const colorMeta = food ? COLOR_CATEGORIES[food.color] : null;

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-stone-200/70">
      {/* Photo thumbnail or placeholder */}
      <PhotoCell entry={entry} />

      {/* Food info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-900 truncate">
          {food ? food.name : (entry.food_id || <span className="text-stone-400 italic">Unidentified</span>)}
        </div>
        <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
          {entry.portion_g != null && <span>{entry.portion_g} g</span>}
          {colorMeta && (
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: colorMeta.hex }}
                aria-hidden="true"
              />
              {colorMeta.label}
            </span>
          )}
          {food?.myplate && <span className="capitalize">{food.myplate}</span>}
          {entry.ai_scan_used && (
            <span className="text-purple-700">AI-scanned</span>
          )}
        </div>
        {entry.description && (
          <div className="text-xs text-stone-500 mt-1 italic truncate">"{entry.description}"</div>
        )}
      </div>
    </div>
  );
}

function PhotoCell({ entry }) {
  if (!entry.photo_storage_path) {
    // No photo — neutral placeholder to keep alignment consistent.
    return (
      <div className="flex items-center justify-center w-14 h-14 rounded-lg border border-dashed border-stone-200 flex-shrink-0">
        <Camera className="w-4 h-4 text-stone-300" />
      </div>
    );
  }

  if (!entry.photo_signed_url) {
    // Path present but URL not generated (signing error).
    return (
      <div className="flex items-center justify-center w-14 h-14 rounded-lg border border-rose-200 bg-rose-50/50 flex-shrink-0" title="Photo unavailable">
        <AlertCircle className="w-4 h-4 text-rose-400" />
      </div>
    );
  }

  return (
    <a
      href={entry.photo_signed_url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-stone-200 group hover:border-emerald-500 transition shadow-sm"
      title="Open photo full-size"
    >
      <img src={entry.photo_signed_url} alt="meal" className="w-full h-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center bg-stone-900/0 group-hover:bg-stone-900/40 transition pointer-events-none">
        <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
      </div>
    </a>
  );
}

function groupByMeal(entries) {
  const groups = {};
  for (const e of entries) {
    const meal = e.meal_occasion || 'Other';
    if (!groups[meal]) groups[meal] = [];
    groups[meal].push(e);
  }
  return groups;
}
