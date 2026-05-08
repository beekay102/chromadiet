// =============================================================
// src/lib/analysis.js
// Pure ChromaDiet analysis algorithm. Computes flavonoid totals,
// color tallies, MyPlate group hits, and the composite ChromaDiet
// score for a list of food entries.
//
// Pure module: no React, no Supabase, no DOM. Importable from both
// the client (ChromaDiet.jsx useMemo) and serverless functions
// (api/finalize.js). This is critical — having one canonical
// implementation prevents client/server score divergence.
//
// Constants (FOOD_DB, NHANES_MEAN, CUT_POINTS, etc.) live in
// src/lib/foodDb.js.
// =============================================================

import {
  FOOD_DB,
  FLAVONOID_CLASSES,
  COLOR_CATEGORIES,
  NHANES_MEAN,
  CUT_POINTS,
  ALGORITHM_VERSION,
  findFoodById,
} from './foodDb.js';

/**
 * Resolve an entry to a list of {foodId, g} pieces for analysis.
 *  - components present  → use those (composite dish or AI-decomposed)
 *  - foodId present      → single-piece [{ foodId, g: portionG }]
 *  - photo-only / blank  → empty array (entry contributes nothing)
 *
 * @param {object} entry — { foodId, portionG, components, ... }
 */
export function resolveEntryComponents(entry) {
  if (entry?.components && entry.components.length) {
    return entry.components.map(c => ({ foodId: c.foodId, g: c.g }));
  }
  if (entry?.foodId) {
    return [{ foodId: entry.foodId, g: entry.portionG }];
  }
  return [];
}

/**
 * Run the ChromaDiet analysis over a list of entries.
 *
 * @param {Array} entries — array of food entries from the intake form
 *                          (or rehydrated from food_entries DB rows).
 *
 * @returns {object} Analysis result. Same shape as the original useMemo
 *   in ChromaDiet.jsx. Top-level keys:
 *     flavTotals, colorCounts, colorPigmentMg, myplateCounts, byMeal,
 *     totalMg, classesPresent, colorsPresent, myplateGroupsHit,
 *     fruitCount, vegCount, fruitColorCounts, vegColorCounts,
 *     totalScore, missingClasses, missingColors,
 *     sources, sufficiency, breakdown,
 *     algorithmVersion (string)
 */
export function computeAnalysis(entries) {
  const flavTotals = { anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 };
  const colorCounts = { red:0, orangeYellow:0, green:0, bluePurple:0, whiteTan:0 };
  const myplateCounts = { fruits:0, vegetables:0, wholeGrains:0, protein:0, healthyFats:0, other:0 };
  const colorPigmentMg = { red:0, orangeYellow:0, green:0, bluePurple:0, whiteTan:0 };
  const byMeal = {};
  let fruitCount = 0, vegCount = 0;
  const fruitColorCounts = { red:0, orangeYellow:0, green:0, bluePurple:0, whiteTan:0 };
  const vegColorCounts = { red:0, orangeYellow:0, green:0, bluePurple:0, whiteTan:0 };

  // Sources attribution: for each class, list contributors {foodId, name, mg}
  const sources = { anthocyanidins:[], flavan3ols:[], flavanones:[], flavones:[], flavonols:[], isoflavones:[] };

  (entries || []).forEach(entry => {
    const pieces = resolveEntryComponents(entry);
    const mealKey = entry.meal || 'Other';
    if (!byMeal[mealKey]) byMeal[mealKey] = { anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 };

    // Track parent-entry membership so MyPlate/color tallies aren't inflated by sub-ingredients
    const parentFood = findFoodById(entry.foodId);
    if (parentFood) {
      colorCounts[parentFood.color] = (colorCounts[parentFood.color] || 0) + 1;
      myplateCounts[parentFood.myplate] = (myplateCounts[parentFood.myplate] || 0) + 1;
      if (parentFood.myplate === 'fruits')     { fruitCount++; fruitColorCounts[parentFood.color]++; }
      if (parentFood.myplate === 'vegetables') { vegCount++;   vegColorCounts[parentFood.color]++; }
    }

    pieces.forEach(piece => {
      const food = findFoodById(piece.foodId);
      if (!food) return;
      const factor = piece.g / 100;
      let pieceTotalMg = 0;
      Object.keys(food.flav).forEach(cls => {
        const mg = food.flav[cls] * factor;
        flavTotals[cls] += mg;
        byMeal[mealKey][cls] += mg;
        pieceTotalMg += mg;
        if (mg > 0) {
          const existing = sources[cls].find(s => s.foodId === piece.foodId);
          if (existing) existing.mg += mg;
          else sources[cls].push({ foodId: piece.foodId, name: food.name, mg });
        }
      });
      // Color-category mg attribution from each piece
      colorPigmentMg[food.color] = (colorPigmentMg[food.color] || 0) + pieceTotalMg;
    });
  });

  // Sort each class's sources by mg desc
  Object.keys(sources).forEach(c => sources[c].sort((a, b) => b.mg - a.mg));

  const totalMg = Object.values(flavTotals).reduce((a, b) => a + b, 0);
  const classesPresent = Object.values(flavTotals).filter(v => v > 0).length;
  const colorsPresent = Object.values(colorCounts).filter(v => v > 0).length;
  const myplateGroupsHit = ['fruits','vegetables','wholeGrains','protein','healthyFats'].filter(k => myplateCounts[k] > 0).length;

  // Composite score: 30 + 25 + 20 + 15 + 10 = 100
  const diversityScore = (classesPresent / 6) * 30;
  const colorScore     = (colorsPresent / 5) * 25;
  const nhanesTotal    = Object.values(NHANES_MEAN).reduce((a, b) => a + b, 0);
  const intakeScore    = Math.min(totalMg / nhanesTotal, 1) * 20;
  const myplateScore   = (myplateGroupsHit / 5) * 15;
  const anthoScore     = Math.min(flavTotals.anthocyanidins / 25, 1) * 10;
  const totalScore     = Math.round(diversityScore + colorScore + intakeScore + myplateScore + anthoScore);

  const missingClasses = Object.keys(FLAVONOID_CLASSES).filter(c => flavTotals[c] === 0);
  const missingColors  = Object.keys(COLOR_CATEGORIES).filter(c => colorCounts[c] === 0);

  // Sufficiency status per class — relative to the documented threshold
  const sufficiency = {};
  Object.keys(FLAVONOID_CLASSES).forEach(c => {
    const cp = CUT_POINTS[c];
    if (!cp || cp.value === null) {
      sufficiency[c] = { status: 'no_target', label: 'No validated target' };
    } else if (flavTotals[c] >= cp.value) {
      sufficiency[c] = { status: 'sufficient', label: `≥ ${cp.value} mg/d threshold met`, target: cp.value };
    } else if (flavTotals[c] === 0) {
      sufficiency[c] = { status: 'absent', label: 'Not detected today', target: cp.value };
    } else {
      sufficiency[c] = { status: 'below', label: `Below ${cp.value} mg/d threshold`, target: cp.value, gap: cp.value - flavTotals[c] };
    }
  });

  return {
    flavTotals, colorCounts, colorPigmentMg, myplateCounts, byMeal,
    totalMg, classesPresent, colorsPresent, myplateGroupsHit,
    fruitCount, vegCount, fruitColorCounts, vegColorCounts,
    totalScore, missingClasses, missingColors,
    sources, sufficiency,
    breakdown: { diversityScore, colorScore, intakeScore, myplateScore, anthoScore },
    algorithmVersion: ALGORITHM_VERSION,
  };
}
