// =============================================================
// src/lib/foodDb.js
// Canonical reference data for ChromaDiet's nutrition analysis.
//
// This module is pure data. No React, no Supabase, no DOM. It can
// be imported safely from both client code (ChromaDiet.jsx) and
// serverless functions (api/finalize.js).
//
// If you change scoring constants or add foods, bump ALGORITHM_VERSION
// so recall_results rows are tagged with the version that produced them.
// =============================================================

// Bump on any change that would alter computed scores or totals.
// Format: vYYYY.M.D — date the algorithm was last meaningfully updated.
export const ALGORITHM_VERSION = 'v2026.5.7';

// =============================================================
// FLAVONOID CLASSES (USDA Database for the Flavonoid Content of
// Selected Foods, Release 3.3) plus per-class color/compound metadata
// used by the UI.
// =============================================================
export const FLAVONOID_CLASSES = {
  anthocyanidins: { label: 'Anthocyanidins', color: '#7B3F9E', compounds: ['Cyanidin','Delphinidin','Malvidin','Pelargonidin','Peonidin','Petunidin'] },
  flavan3ols:    { label: 'Flavan-3-ols',    color: '#A0522D', compounds: ['(-)-Epicatechin','(-)-Epicatechin 3-gallate','(-)-Epigallocatechin','(-)-Epigallocatechin 3-gallate','(+)-Catechin','(+)-Gallocatechin','Theaflavin','Theaflavin-3,3\'-digallate','Theaflavin-3\'-gallate','Theaflavin-3-gallate','Thearubigins'] },
  flavanones:    { label: 'Flavanones',      color: '#F5A623', compounds: ['Eriodictyol','Hesperetin','Naringenin'] },
  flavones:      { label: 'Flavones',        color: '#7CB342', compounds: ['Apigenin','Luteolin'] },
  flavonols:     { label: 'Flavonols',       color: '#D4A017', compounds: ['Isorhamnetin','Kaempferol','Myricetin','Quercetin'] },
  isoflavones:   { label: 'Isoflavones',     color: '#D87C5A', compounds: ['Daidzein','Genistein','Glycitein'] },
};

// =============================================================
// KHOO 2017 COLOR CATEGORIES
// =============================================================
export const COLOR_CATEGORIES = {
  red:        { label: 'Red',          hex: '#C73E3E' },
  orangeYellow:{ label: 'Orange/Yellow',hex: '#E89422' },
  green:      { label: 'Green',        hex: '#5B8C3E' },
  bluePurple: { label: 'Blue/Purple',  hex: '#7B3F9E' },
  whiteTan:   { label: 'White/Tan',    hex: '#BCAAA4' },
};

// =============================================================
// FOOD DATABASE
// Single-ingredient foods, per 100 g (per cup for beverages).
// flav values are mg of each flavonoid class per reference portion.
// myplate: fruits | vegetables | wholeGrains | protein | healthyFats | other
// color:   keys must match COLOR_CATEGORIES above
// =============================================================
export const FOOD_DB = [
  { id:'blueberry', name:'Blueberries', myplate:'fruits', color:'bluePurple', flav:{ anthocyanidins:163.5, flavan3ols:25.8, flavanones:0, flavones:0, flavonols:8.2, isoflavones:0 } },
  { id:'blackberry', name:'Blackberries', myplate:'fruits', color:'bluePurple', flav:{ anthocyanidins:90.0, flavan3ols:36.7, flavanones:0, flavones:0, flavonols:1.5, isoflavones:0 } },
  { id:'strawberry', name:'Strawberries', myplate:'fruits', color:'red', flav:{ anthocyanidins:21.2, flavan3ols:5.2, flavanones:0, flavones:0, flavonols:1.1, isoflavones:0 } },
  { id:'raspberry', name:'Raspberries', myplate:'fruits', color:'red', flav:{ anthocyanidins:38.7, flavan3ols:7.0, flavanones:0, flavones:0, flavonols:1.1, isoflavones:0 } },
  { id:'cranberry', name:'Cranberries', myplate:'fruits', color:'red', flav:{ anthocyanidins:91.6, flavan3ols:7.7, flavanones:0, flavones:0, flavonols:15.1, isoflavones:0 } },
  { id:'red_grape', name:'Red grapes', myplate:'fruits', color:'bluePurple', flav:{ anthocyanidins:26.7, flavan3ols:13.0, flavanones:0, flavones:0, flavonols:3.5, isoflavones:0 } },
  { id:'red_wine', name:'Red wine (1 glass)', myplate:'other', color:'bluePurple', flav:{ anthocyanidins:9.0, flavan3ols:32.0, flavanones:0, flavones:0, flavonols:3.2, isoflavones:0 } },
  { id:'orange', name:'Orange', myplate:'fruits', color:'orangeYellow', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:42.6, flavones:0.6, flavonols:0.4, isoflavones:0 } },
  { id:'grapefruit', name:'Grapefruit', myplate:'fruits', color:'orangeYellow', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:53.1, flavones:0, flavonols:0.4, isoflavones:0 } },
  { id:'lemon', name:'Lemon', myplate:'fruits', color:'orangeYellow', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:30.2, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'apple', name:'Apple (with skin)', myplate:'fruits', color:'red', flav:{ anthocyanidins:1.3, flavan3ols:7.0, flavanones:0, flavones:0, flavonols:3.6, isoflavones:0 } },
  { id:'cherry', name:'Sweet cherries', myplate:'fruits', color:'red', flav:{ anthocyanidins:30.2, flavan3ols:6.3, flavanones:0, flavones:0, flavonols:1.2, isoflavones:0 } },
  { id:'red_onion', name:'Red onion', myplate:'vegetables', color:'bluePurple', flav:{ anthocyanidins:13.0, flavan3ols:0, flavanones:0, flavones:0, flavonols:30.6, isoflavones:0 } },
  { id:'yellow_onion', name:'Yellow onion', myplate:'vegetables', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:25.3, isoflavones:0 } },
  { id:'kale', name:'Kale', myplate:'vegetables', color:'green', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:38.8, isoflavones:0 } },
  { id:'broccoli', name:'Broccoli', myplate:'vegetables', color:'green', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:6.0, isoflavones:0 } },
  { id:'spinach', name:'Spinach', myplate:'vegetables', color:'green', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:6.0, isoflavones:0 } },
  { id:'red_cabbage', name:'Red cabbage', myplate:'vegetables', color:'bluePurple', flav:{ anthocyanidins:73.0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0.4, isoflavones:0 } },
  { id:'tomato', name:'Tomato', myplate:'vegetables', color:'red', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:1.6, flavones:0, flavonols:1.6, isoflavones:0 } },
  { id:'parsley', name:'Parsley', myplate:'vegetables', color:'green', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:215.5, flavonols:8.7, isoflavones:0 } },
  { id:'celery', name:'Celery', myplate:'vegetables', color:'green', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:22.6, flavonols:0.5, isoflavones:0 } },
  { id:'green_tea', name:'Green tea (1 cup)', myplate:'other', color:'green', flav:{ anthocyanidins:0, flavan3ols:127.0, flavanones:0, flavones:0, flavonols:2.2, isoflavones:0 } },
  { id:'black_tea', name:'Black tea (1 cup)', myplate:'other', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:115.0, flavanones:0, flavones:0, flavonols:4.8, isoflavones:0 } },
  { id:'dark_chocolate', name:'Dark chocolate', myplate:'other', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:108.0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'cocoa', name:'Cocoa powder', myplate:'other', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:511.0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'tofu', name:'Tofu', myplate:'protein', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:22.7 } },
  { id:'soymilk', name:'Soymilk (1 cup)', myplate:'protein', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:7.3 } },
  { id:'edamame', name:'Edamame', myplate:'protein', color:'green', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:17.9 } },
  { id:'whole_wheat', name:'Whole wheat bread', myplate:'wholeGrains', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:1.0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'oats', name:'Oatmeal', myplate:'wholeGrains', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'brown_rice', name:'Brown rice', myplate:'wholeGrains', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'salmon', name:'Salmon', myplate:'protein', color:'orangeYellow', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'chicken', name:'Chicken breast', myplate:'protein', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'avocado', name:'Avocado', myplate:'healthyFats', color:'green', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'olive_oil', name:'Olive oil', myplate:'healthyFats', color:'orangeYellow', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'walnuts', name:'Walnuts', myplate:'healthyFats', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'almonds', name:'Almonds', myplate:'healthyFats', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:6.5, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'pomegranate', name:'Pomegranate', myplate:'fruits', color:'red', flav:{ anthocyanidins:36.0, flavan3ols:0, flavanones:0, flavones:0, flavonols:1.0, isoflavones:0 } },
  { id:'eggplant', name:'Eggplant', myplate:'vegetables', color:'bluePurple', flav:{ anthocyanidins:13.8, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
  { id:'banana', name:'Banana', myplate:'fruits', color:'whiteTan', flav:{ anthocyanidins:0, flavan3ols:1.5, flavanones:0, flavones:0, flavonols:0, isoflavones:0 } },
];

// =============================================================
// COMPOSITE DISHES
// Dishes that decompose into single-ingredient subFoods, with
// typical-portion grams per dish.
// =============================================================
export const COMPOSITE_DISHES = {
  berry_oatmeal: {
    label: 'Mixed berry oatmeal (1 bowl)',
    components: [
      { foodId:'oats', g:40 }, { foodId:'blueberry', g:30 }, { foodId:'strawberry', g:30 }, { foodId:'almonds', g:10 }
    ],
  },
  kale_cranberry_walnut_salad: {
    label: 'Kale-cranberry-walnut salad',
    components: [
      { foodId:'kale', g:80 }, { foodId:'cranberry', g:15 }, { foodId:'walnuts', g:15 }, { foodId:'olive_oil', g:7 }
    ],
  },
  greek_salad: {
    label: 'Greek-style salad',
    components: [
      { foodId:'tomato', g:80 }, { foodId:'red_onion', g:25 }, { foodId:'parsley', g:5 }, { foodId:'olive_oil', g:10 }
    ],
  },
  fruit_smoothie: {
    label: 'Berry-banana smoothie',
    components: [
      { foodId:'blueberry', g:60 }, { foodId:'banana', g:80 }, { foodId:'soymilk', g:200 }, { foodId:'oats', g:15 }
    ],
  },
};

// =============================================================
// NHANES 2007–2008 U.S. ADULT MEAN FLAVONOID INTAKE (mg/day)
// Used as the comparison baseline for cohort and individual charts.
// Source: USDA What We Eat in America (NHANES) flavonoid intakes.
// =============================================================
export const NHANES_MEAN = {
  anthocyanidins: 11.6,
  flavan3ols:     156.5,
  flavanones:     14.4,
  flavones:       1.6,
  flavonols:      12.9,
  isoflavones:    1.3,
};

// =============================================================
// CUT POINTS — daily intake thresholds with documented health benefit.
// value=null means no validated daily target exists (yet).
// =============================================================
export const CUT_POINTS = {
  anthocyanidins: { value: 25,   source: 'Khoo 2017 — observational cardiovascular benefit threshold', outcome: 'Cardiovascular / metabolic' },
  flavan3ols:    { value: 400,   source: 'COSMOS 2022 / cocoa flavanol RCTs',                           outcome: 'Endothelial function & blood pressure' },
  isoflavones:   { value: 25,    source: 'NIH ODS — menopausal symptom relief studies',                outcome: 'Menopausal / bone' },
  flavonols:     { value: 10,    source: 'Bondonno 2019 EPIC cohort',                                   outcome: 'Cardiovascular mortality' },
  flavanones:    { value: null,  source: 'No validated daily target',                                   outcome: '—' },
  flavones:      { value: null,  source: 'No validated daily target',                                   outcome: '—' },
};

// =============================================================
// HELPERS — fast lookups indexed by id for hot paths
// =============================================================
const FOOD_BY_ID = Object.fromEntries(FOOD_DB.map(f => [f.id, f]));
export function findFoodById(foodId) {
  return FOOD_BY_ID[foodId] || null;
}
