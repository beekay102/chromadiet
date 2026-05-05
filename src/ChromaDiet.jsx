import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Plus, Trash2, Download, BookOpen, ChevronRight,
  Apple, Carrot, Wheat, Fish, Droplet, Users, User, Sparkles,
  ScrollText, FlaskConical, AlertCircle, Leaf, Camera, X, Wand2,
  Filter, HelpCircle, ListTree,
  CheckCircle2, MinusCircle, ExternalLink, LogOut
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

// =============================================================
// LOCAL STORAGE WRAPPER
// =============================================================
const localStore = {
  async list(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return { keys };
  },
  async get(key) {
    const value = localStorage.getItem(key);
    return value !== null ? { key, value } : null;
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
};

// =============================================================
// REFERENCE DATA — flavonoid classes, color categories, food DB
// =============================================================
const FLAVONOID_CLASSES = {
  anthocyanidins: { label: 'Anthocyanidins', color: '#7B3F9E', compounds: ['Cyanidin','Delphinidin','Malvidin','Pelargonidin','Peonidin','Petunidin'] },
  flavan3ols:    { label: 'Flavan-3-ols',    color: '#A0522D', compounds: ['(-)-Epicatechin','(-)-Epicatechin 3-gallate','(-)-Epigallocatechin','(-)-Epigallocatechin 3-gallate','(+)-Catechin','(+)-Gallocatechin','Theaflavin','Theaflavin-3,3\'-digallate','Theaflavin-3\'-gallate','Theaflavin-3-gallate','Thearubigins'] },
  flavanones:    { label: 'Flavanones',      color: '#F5A623', compounds: ['Eriodictyol','Hesperetin','Naringenin'] },
  flavones:      { label: 'Flavones',        color: '#7CB342', compounds: ['Apigenin','Luteolin'] },
  flavonols:     { label: 'Flavonols',       color: '#D4A017', compounds: ['Isorhamnetin','Kaempferol','Myricetin','Quercetin'] },
  isoflavones:   { label: 'Isoflavones',     color: '#D87C5A', compounds: ['Daidzein','Genistein','Glycitein'] },
};

const COLOR_CATEGORIES = {
  red:        { label: 'Red',          hex: '#C73E3E' },
  orangeYellow:{ label: 'Orange/Yellow',hex: '#E89422' },
  green:      { label: 'Green',        hex: '#5B8C3E' },
  bluePurple: { label: 'Blue/Purple',  hex: '#7B3F9E' },
  whiteTan:   { label: 'White/Tan',    hex: '#BCAAA4' },
};

// Single-ingredient food database (mg per 100g)
const FOOD_DB = [
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

// Composite dishes — decompose to single-ingredient subFoods.
// Quantities are typical-portion grams of each ingredient per 1 dish serving.
const COMPOSITE_DISHES = {
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

// USDA NHANES 2007–2008 mean intakes (mg/day, adults 19+) — approximate
const NHANES_MEAN = {
  anthocyanidins: 11.6, flavan3ols: 156.5, flavanones: 14.4,
  flavones: 1.6, flavonols: 12.9, isoflavones: 1.3,
};

// Health benefit key — full descriptions (Khoo 2017, Tables 2–3 plus mechanistic literature)
const HEALTH_BENEFITS_KEY = {
  cardiovascular: { label: 'Cardiovascular protection', desc: 'Reduced incidence of coronary heart disease, stroke, and cardiovascular mortality observed in cohort studies of high-flavonoid diets.', refs: ['Khoo 2017 §3.2','Bondonno 2019 EPIC'] },
  antiInflammatory: { label: 'Anti-inflammatory effects', desc: 'Modulation of NF-κB and cytokine signaling; lower CRP and IL-6 in randomized feeding trials.', refs: ['Khoo 2017 §3.4'] },
  insulinSensitivity: { label: 'Improved insulin sensitivity', desc: 'Lower fasting glucose and HOMA-IR observed with anthocyanin supplementation in metabolic syndrome studies.', refs: ['Khoo 2017 §3.5'] },
  vision: { label: 'Visual function support', desc: 'Anthocyanins concentrate in retinal pigment epithelium; supplementation linked to dark adaptation and contrast sensitivity in small RCTs.', refs: ['Khoo 2017 §3.6'] },
  neuroprotection: { label: 'Neuroprotection', desc: 'Animal and human studies link berry/cocoa flavonoid intake to attenuated cognitive decline; mechanism includes BDNF upregulation and cerebrovascular flow.', refs: ['Khoo 2017 §3.7'] },
  endothelial: { label: 'Improved endothelial function', desc: 'Flow-mediated dilation increases acutely after cocoa flavanol intake; sustained with chronic intake ≥400 mg/d.', refs: ['Khoo 2017 §3.2','COSMOS trial 2022'] },
  bp: { label: 'Reduced blood pressure', desc: 'Meta-analyses show 1–3 mmHg systolic reduction with sustained flavan-3-ol intake; magnitude depends on baseline BP.', refs: ['Khoo 2017 §3.2'] },
  antioxidant: { label: 'Antioxidant activity', desc: 'In-vitro radical scavenging capacity does not directly translate to in-vivo benefits but contributes to overall redox homeostasis.', refs: ['Khoo 2017 §3.1'] },
  lipidProfile: { label: 'Lipid profile improvement', desc: 'Modest reductions in LDL-C and increases in HDL-C in flavanone supplementation trials.', refs: ['Khoo 2017 §3.3'] },
  cancerInVitro: { label: 'Anti-cancer activity (in vitro)', desc: 'Cell-line studies show apoptosis induction and proliferation inhibition. Translation to clinical outcomes is unproven.', refs: ['Khoo 2017 §4'] },
  cvdMortality: { label: 'Reduced cardiovascular mortality', desc: 'Large prospective cohorts (EPIC, Nurses Health) link total flavonol intake ≥10 mg/d to lower CVD mortality.', refs: ['Khoo 2017 §3.2','Bondonno 2019'] },
  bone: { label: 'Bone health support', desc: 'Soy isoflavones may attenuate post-menopausal bone loss in some trials; evidence is mixed.', refs: ['NIH ODS Isoflavones FS'] },
  menopause: { label: 'Menopausal symptom relief', desc: 'Modest reduction in hot-flash frequency in some trials of soy isoflavone supplementation.', refs: ['NIH ODS Isoflavones FS'] },
  hormone: { label: 'Hormone-related effects', desc: 'Weak phytoestrogenic activity; may modulate estrogen-receptor signaling in post-menopausal women.', refs: ['NIH ODS Isoflavones FS'] },
};

// Map each flavonoid class to relevant health benefits (Khoo Tables 2–3 + extensions)
const CLASS_BENEFITS = {
  anthocyanidins: ['cardiovascular','antiInflammatory','insulinSensitivity','vision','neuroprotection'],
  flavan3ols:    ['endothelial','bp','antioxidant','neuroprotection'],
  flavanones:    ['lipidProfile','antiInflammatory'],
  flavones:      ['cancerInVitro','antioxidant'],
  flavonols:     ['cvdMortality','antiInflammatory'],
  isoflavones:   ['bone','menopause','hormone'],
};

// Sufficiency cut-points — research-suggested intake guides, NOT formal RDAs
const CUT_POINTS = {
  anthocyanidins: { value: 25, source: 'Khoo 2017 — observational cardiovascular benefit threshold', outcome: 'Cardiovascular / metabolic' },
  flavan3ols:    { value: 400, source: 'COSMOS 2022 / cocoa flavanol RCTs', outcome: 'Endothelial function & blood pressure' },
  isoflavones:   { value: 25, source: 'NIH ODS — menopausal symptom relief studies', outcome: 'Menopausal / bone' },
  flavonols:     { value: 10, source: 'Bondonno 2019 EPIC cohort', outcome: 'Cardiovascular mortality' },
  flavanones:    { value: null, source: 'No validated daily target', outcome: '—' },
  flavones:      { value: null, source: 'No validated daily target', outcome: '—' },
};

// =============================================================
// COMPONENT
// =============================================================
export default function ChromaDiet() {
  // Pull participant identity from the auth profile (populated by the
  // handle_new_user trigger from raw_user_meta_data at signup time).
  // ProtectedRoute already waits on profileLoading, so by the time
  // this component renders, profile is non-null.
  const { profile, signOut, isDemo } = useAuth();
  const participantId = profile?.participant_code || '';
  const demographics = {
    ageRange:   profile?.age_range   || '',
    sex:        profile?.sex         || '',
    cohortCode: profile?.cohort_code || '',
  };
  // Schema stores consent as a timestamp (consent_given_at), not a bool.
  // Treat any non-null timestamp as "consent on file."
  const consent = !!profile?.consent_given_at;

  // No-op shims for any code that still calls these. Demographics + consent
  // are now captured at signup; the intake form should not be writing them.
  // Remove the shims once every call site is migrated.
  const setDemographics = () => {};
  const setConsent = () => {};

  // Entries support: text-only (foodId set), photo-only (foodId='', photo set), or both.
  // Components array represents ingredient-level breakdown for composite dishes.
  const [entries, setEntries] = useState([
    { id:1, foodId:'blueberry', portionG:75, meal:'Breakfast', photo:null, description:'', components:null },
    { id:2, foodId:'green_tea', portionG:240, meal:'Breakfast', photo:null, description:'', components:null },
    { id:3, foodId:'kale',      portionG:60, meal:'Lunch',     photo:null, description:'', components:null },
    { id:4, foodId:'red_onion', portionG:40, meal:'Lunch',     photo:null, description:'', components:null },
    { id:5, foodId:'salmon',    portionG:140, meal:'Dinner',   photo:null, description:'', components:null },
  ]);

  // AI scan state
  const [aiScanning, setAiScanning] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [aiError, setAiError] = useState(null);

  const [submitted, setSubmitted] = useState(false);
  const [cohort, setCohort] = useState([]);
  const [cohortLoading, setCohortLoading] = useState(true);
  const [cohortFilter, setCohortFilter] = useState({ ageRange:'all', sex:'all', cohortCode:'all' });
  const [openHelp, setOpenHelp] = useState(null); // tracks which help/glossary section is open

  useEffect(() => {
    (async () => {
      try {
        const list = await localStore.list('chromadiet:participant:');
        if (list && list.keys && list.keys.length) {
          const fetched = await Promise.all(
            list.keys.map(async (k) => {
              try { const r = await localStore.get(k); return r ? JSON.parse(r.value) : null; }
              catch { return null; }
            })
          );
          setCohort(fetched.filter(Boolean));
        } else {
          setCohort([]);
        }
      } catch (e) { /* ignore */ }
      finally { setCohortLoading(false); }
    })();
  }, [submitted]);

  // Resolve an entry to a list of {foodId, grams} pieces.
  // - If `components` is set, use those
  // - else if `foodId` is set, use the single foodId at portionG
  // - else (photo-only entry awaiting AI scan), return empty
  const resolveEntryComponents = (entry) => {
    if (entry.components && entry.components.length) {
      return entry.components.map(c => ({ foodId: c.foodId, g: c.g }));
    }
    if (entry.foodId) {
      return [{ foodId: entry.foodId, g: entry.portionG }];
    }
    return [];
  };

  // -------- COMPUTED ANALYSIS --------
  const analysis = useMemo(() => {
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

    entries.forEach(entry => {
      const pieces = resolveEntryComponents(entry);
      const mealKey = entry.meal || 'Other';
      if (!byMeal[mealKey]) byMeal[mealKey] = { anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 };

      // Track parent-entry membership so MyPlate/color tallies aren't inflated by sub-ingredients
      const parentFood = FOOD_DB.find(f => f.id === entry.foodId);
      if (parentFood) {
        colorCounts[parentFood.color] = (colorCounts[parentFood.color] || 0) + 1;
        myplateCounts[parentFood.myplate] = (myplateCounts[parentFood.myplate] || 0) + 1;
        if (parentFood.myplate === 'fruits') { fruitCount++; fruitColorCounts[parentFood.color]++; }
        if (parentFood.myplate === 'vegetables') { vegCount++; vegColorCounts[parentFood.color]++; }
      }

      pieces.forEach(piece => {
        const food = FOOD_DB.find(f => f.id === piece.foodId);
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
        // Color-category mg attribution from each piece (so a salad's pigments are split correctly)
        colorPigmentMg[food.color] = (colorPigmentMg[food.color] || 0) + pieceTotalMg;
      });
    });

    // Sort each class's sources by mg desc
    Object.keys(sources).forEach(c => sources[c].sort((a,b) => b.mg - a.mg));

    const totalMg = Object.values(flavTotals).reduce((a,b)=>a+b, 0);
    const classesPresent = Object.values(flavTotals).filter(v => v > 0).length;
    const colorsPresent = Object.values(colorCounts).filter(v => v > 0).length;
    const myplateGroupsHit = ['fruits','vegetables','wholeGrains','protein','healthyFats'].filter(k => myplateCounts[k] > 0).length;

    const diversityScore = (classesPresent / 6) * 30;
    const colorScore = (colorsPresent / 5) * 25;
    const nhanesTotal = Object.values(NHANES_MEAN).reduce((a,b)=>a+b, 0);
    const intakeScore = Math.min(totalMg / nhanesTotal, 1) * 20;
    const myplateScore = (myplateGroupsHit / 5) * 15;
    const anthoScore = Math.min(flavTotals.anthocyanidins / 25, 1) * 10;
    const totalScore = Math.round(diversityScore + colorScore + intakeScore + myplateScore + anthoScore);

    const missingClasses = Object.keys(FLAVONOID_CLASSES).filter(c => flavTotals[c] === 0);
    const missingColors = Object.keys(COLOR_CATEGORIES).filter(c => colorCounts[c] === 0);

    // Sufficiency status per class
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
      breakdown: { diversityScore, colorScore, intakeScore, myplateScore, anthoScore }
    };
  }, [entries]);

  // -------- COHORT AGGREGATE (with sub-group filter) --------
  const filteredCohort = useMemo(() => {
    return cohort.filter(p => {
      if (cohortFilter.ageRange !== 'all' && p.demographics?.ageRange !== cohortFilter.ageRange) return false;
      if (cohortFilter.sex !== 'all' && p.demographics?.sex !== cohortFilter.sex) return false;
      if (cohortFilter.cohortCode !== 'all' && p.demographics?.cohortCode !== cohortFilter.cohortCode) return false;
      return true;
    });
  }, [cohort, cohortFilter]);

  const cohortStats = useMemo(() => {
    if (!filteredCohort.length) return null;
    const sums = { anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 };
    let scoreSum = 0;
    filteredCohort.forEach(p => {
      Object.keys(sums).forEach(k => sums[k] += (p.flavTotals[k] || 0));
      scoreSum += p.totalScore || 0;
    });
    const means = {};
    Object.keys(sums).forEach(k => means[k] = sums[k] / filteredCohort.length);
    return { n: filteredCohort.length, means, meanScore: scoreSum / filteredCohort.length };
  }, [filteredCohort]);

  // Available filter options derived from the actual cohort data
  const cohortFilterOptions = useMemo(() => {
    const ageRanges = new Set(['all']);
    const sexes = new Set(['all']);
    const cohortCodes = new Set(['all']);
    cohort.forEach(p => {
      if (p.demographics?.ageRange) ageRanges.add(p.demographics.ageRange);
      if (p.demographics?.sex) sexes.add(p.demographics.sex);
      if (p.demographics?.cohortCode) cohortCodes.add(p.demographics.cohortCode);
    });
    return {
      ageRanges: Array.from(ageRanges),
      sexes: Array.from(sexes),
      cohortCodes: Array.from(cohortCodes),
    };
  }, [cohort]);

  const [tab, setTab] = useState('intake');
  // -------- HANDLERS --------
  const addEntry = () => setEntries([...entries, { id: Date.now(), foodId: '', portionG: 100, meal: 'Snack', photo: null, description: '', components: null }]);
  const updateEntry = (id, key, val) => setEntries(entries.map(e => e.id === id ? { ...e, [key]: val } : e));
  const removeEntry = (id) => setEntries(entries.filter(e => e.id !== id));

  const handlePhotoUpload = (id, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image too large. Please choose a file under 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      // Photo upload signals "let AI determine this entry" — clear food and portion
      // so the AI can estimate independently. User can manually override afterward.
      setEntries(curr => curr.map(entry => entry.id === id ? {
        ...entry,
        photo: e.target.result,
        foodId: '',
        portionG: 0,
        components: null,
      } : entry));
    };
    reader.readAsDataURL(file);
  };

  const stubAnalyzePhotos = async () => {
    const scannable = entries.filter(e => e.photo || e.description);
    if (scannable.length === 0) {
      alert('Add at least one photo or description to a food entry first.');
      return;
    }
    setAiScanning(true);
    setAiError(null);
    setAiResults(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: scannable.map(e => ({
            id: e.id,
            photo: e.photo,
            description: e.description,
            portionG: e.portionG,
            meal: e.meal,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server returned ${res.status}`);
      }
      setAiResults(data);
    } catch (err) {
      setAiError(err.message || String(err));
    } finally {
      setAiScanning(false);
    }
  };

  // Apply AI-suggested matches to entries. Replaces single-food entries with
  // ingredient breakdowns when the AI returns multiple matches per entry.
  const applyAiResults = () => {
    if (!aiResults?.entries) return;
    const newEntries = entries.map(entry => {
      const aiMatch = aiResults.entries.find(a => a.originalEntryId === entry.id);
      if (!aiMatch || !aiMatch.matches?.length) return entry;
      const validMatches = aiMatch.matches.filter(m => m.foodId);
      if (validMatches.length === 0) return entry;
      if (validMatches.length === 1) {
        const m = validMatches[0];
        return { ...entry, foodId: m.foodId, portionG: Math.round(m.portionG), components: null };
      }
      // Multi-ingredient: build components array
      return {
        ...entry,
        foodId: validMatches[0].foodId,
        portionG: Math.round(validMatches.reduce((sum, m) => sum + m.portionG, 0)),
        components: validMatches.map(m => ({ foodId: m.foodId, g: Math.round(m.portionG) })),
      };
    });
    setEntries(newEntries);
    setAiResults(null);
  };

  // Compose entry — convert single-food entry into a composite by loading a preset
  const applyComposite = (entryId, compositeId) => {
    const composite = COMPOSITE_DISHES[compositeId];
    if (!composite) return;
    setEntries(entries.map(e => e.id === entryId ? {
      ...e,
      foodId: composite.components[0].foodId, // representative for color/MyPlate tagging
      portionG: composite.components.reduce((a,c)=>a+c.g, 0),
      components: composite.components.map(c => ({ ...c })),
      description: composite.label,
    } : e));
  };

  const customizeComponents = (entryId) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    if (!entry.components) {
      // Initialize from current foodId
      updateEntry(entryId, 'components', [{ foodId: entry.foodId, g: entry.portionG }]);
    }
  };

  const collapseComponents = (entryId) => {
    updateEntry(entryId, 'components', null);
  };

  const updateComponent = (entryId, idx, key, val) => {
    setEntries(entries.map(e => {
      if (e.id !== entryId) return e;
      const newComps = e.components.map((c,i) => i === idx ? { ...c, [key]: val } : c);
      return { ...e, components: newComps };
    }));
  };

  const addComponent = (entryId) => {
    setEntries(entries.map(e => {
      if (e.id !== entryId) return e;
      const newComps = [...(e.components || []), { foodId: FOOD_DB[0].id, g: 50 }];
      return { ...e, components: newComps };
    }));
  };

  const removeComponent = (entryId, idx) => {
    setEntries(entries.map(e => {
      if (e.id !== entryId) return e;
      const newComps = e.components.filter((_,i) => i !== idx);
      return { ...e, components: newComps.length ? newComps : null };
    }));
  };

  const submitToCohort = async () => {
    if (!consent) { alert('Please confirm consent before submitting to the cohort.'); return; }
    const record = {
      participantId, demographics, timestamp: new Date().toISOString(),
      flavTotals: analysis.flavTotals, totalScore: analysis.totalScore,
      totalMg: analysis.totalMg, entryCount: entries.length,
    };
    try {
      await localStore.set(`chromadiet:participant:${participantId}:${Date.now()}`, JSON.stringify(record));
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (e) { alert('Submission failed: ' + e.message); }
  };

  const clearCohort = async () => {
    if (!window.confirm('Clear all locally stored cohort submissions? This cannot be undone.')) return;
    try {
      const list = await localStore.list('chromadiet:participant:');
      await Promise.all((list.keys || []).map(k => localStore.delete(k)));
      setCohort([]);
    } catch (e) { alert('Clear failed: ' + e.message); }
  };

  const exportReport = () => {
    const report = { participantId, demographics, timestamp: new Date().toISOString(), entries, analysis };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `chromadiet_${participantId}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // -------- UI HELPERS --------
  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm rounded-full transition-all ${
        tab === id
          ? 'bg-white shadow-sm text-emerald-800 font-semibold border border-emerald-200'
          : 'text-stone-600 hover:bg-white/60 hover:text-emerald-800'
      }`}
    >
      <Icon size={15} strokeWidth={1.75} />
      <span style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</span>
    </button>
  );

  const Card = ({ children, className = '', accent, style }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-stone-200/70 ${className}`} style={{ ...(accent ? { borderTop: `3px solid ${accent}` } : {}), ...(style || {}) }}>
      {children}
    </div>
  );

  const SectionHeading = ({ eyebrow, title, sub }) => (
    <div className="mb-10 pb-6 border-b border-stone-200">
      {eyebrow && (
        <div className="text-[11px] tracking-[0.25em] uppercase text-emerald-700 font-semibold mb-3">{eyebrow}</div>
      )}
      <h2 style={{ fontFamily: 'Fraunces, Georgia, serif' }} className="text-4xl md:text-5xl text-stone-900 leading-tight font-semibold">{title}</h2>
      {sub && <p className="text-stone-600 mt-3 text-base leading-relaxed max-w-3xl">{sub}</p>}
    </div>
  );

  const SubHeading = ({ label, title, hint }) => (
    <div className="mb-4">
      <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">{label}</div>
      <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium">{title}</div>
      {hint && <div className="text-xs text-stone-500 mt-1">{hint}</div>}
    </div>
  );

  // Chart data
  const radarData = Object.keys(FLAVONOID_CLASSES).map(k => ({
    class: FLAVONOID_CLASSES[k].label,
    intake: Number(analysis.flavTotals[k].toFixed(1)),
    nhanes: NHANES_MEAN[k],
  }));

  const classBarData = Object.keys(FLAVONOID_CLASSES).map(k => ({
    name: FLAVONOID_CLASSES[k].label,
    mg: Number(analysis.flavTotals[k].toFixed(2)),
    fill: FLAVONOID_CLASSES[k].color,
  }));

  const colorPieData = Object.keys(COLOR_CATEGORIES)
    .filter(k => analysis.colorPigmentMg[k] > 0)
    .map(k => ({
      name: COLOR_CATEGORIES[k].label,
      value: Number(analysis.colorPigmentMg[k].toFixed(2)),
      fill: COLOR_CATEGORIES[k].hex,
    }));

  const mealStackData = Object.keys(analysis.byMeal).map(meal => {
    const row = { meal };
    Object.keys(FLAVONOID_CLASSES).forEach(k => row[FLAVONOID_CLASSES[k].label] = Number(analysis.byMeal[meal][k].toFixed(2)));
    return row;
  });

  return (
    <div className="min-h-screen text-stone-900" style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: 'linear-gradient(180deg, #F0F7E8 0%, #E3EFD3 50%, #F0F7E8 100%)',
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />

      {/* Header */}
      <header>
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm" style={{
              background: 'conic-gradient(from 0deg, #7B3F9E, #C73E3E, #E89422, #D4A017, #5B8C3E, #7B3F9E)'
            }} />
            <div>
              <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold text-stone-900 leading-none tracking-tight">
                ChromaDiet
              </div>
              <div className="text-[11px] tracking-[0.18em] uppercase text-stone-500 mt-1.5">Color Pigment & Flavonoid Intake Analyzer</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isDemo && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-purple-100 text-purple-800 border border-purple-200">
                Demo
              </span>
            )}
            <div className="text-right hidden md:block">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Participant</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-sm text-emerald-800 font-medium">{participantId}</div>
            </div>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-8 pb-8">
          <div className="flex flex-wrap gap-1.5 bg-white/50 backdrop-blur-sm p-1.5 rounded-full border border-stone-200/60 w-fit">
            <TabButton id="intake" label="Log Intake" icon={Plus} />
            <TabButton id="results" label="My Results" icon={User} />
            <TabButton id="cohort" label="Cohort View" icon={Users} />
            <TabButton id="phase2" label="Phase 2 — Sensory" icon={Sparkles} />
            <TabButton id="methods" label="Methods & References" icon={ScrollText} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-8 pb-12">

        {/* ========== INTAKE TAB ========== */}
        {tab === 'intake' && (
          <div>
            <SectionHeading
              eyebrow="Phase 01 · 24-Hour Recall"
              title="Log what you ate yesterday."
              sub="Enter foods and beverages consumed in the past 24 hours along with portion sizes. The analyzer will quantify your intake of the six USDA flavonoid classes and map them to color categories from Khoo et al. (2017). For composite dishes (e.g., salads, smoothies, mixed bowls), break them into ingredients using the Components feature for accurate analysis."
            />

            <Card className="p-6 mb-5">
              <div className="text-[11px] tracking-[0.2em] uppercase text-stone-500 mb-4 font-semibold">Onboarding</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-stone-700 font-medium mb-1.5">Age range</label>
                  <select value={demographics.ageRange} onChange={e=>setDemographics({...demographics, ageRange:e.target.value})} className="w-full border border-stone-300 px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500">
                    <option value="">Select</option>
                    <option>18-29</option><option>30-44</option><option>45-59</option><option>60-74</option><option>75+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-700 font-medium mb-1.5">Sex</label>
                  <select value={demographics.sex} onChange={e=>setDemographics({...demographics, sex:e.target.value})} className="w-full border border-stone-300 px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500">
                    <option value="">Select</option>
                    <option>Female</option><option>Male</option><option>Other / Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-700 font-medium mb-1.5">Study / Cohort code</label>
                  <input value={demographics.cohortCode} onChange={e=>setDemographics({...demographics, cohortCode:e.target.value})} placeholder="e.g., NUTR-2026-A" className="w-full border border-stone-300 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-start gap-2 text-xs text-stone-700 leading-snug">
                    <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-600" />
                    <span>I consent to anonymous use of this data for IRB-approved research and aggregate cohort analysis.</span>
                  </label>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3"><ScrollText size={13} /> Text template</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xs bg-stone-50 p-3.5 border border-stone-200 leading-relaxed rounded-lg">
                  Meal,Food item,Description,Portion<br/>
                  Breakfast,Berry oatmeal,Oats + blueberries + strawberries + almonds,1 bowl<br/>
                  Lunch,Kale-cranberry salad,Kale + cranberries + walnuts + olive oil,1 bowl
                </div>
              </Card>
              <Card className="p-5" style={{ borderLeft: '3px solid #7B3F9E' }}>
                <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-stone-700 font-semibold mb-3"><Camera size={13} /> Photo guidelines</div>
                <ul className="text-sm text-stone-700 leading-relaxed space-y-1.5 list-disc pl-5">
                  <li>Photograph each meal from above (flat lay) or at an angle showing depth</li>
                  <li>Include a fork, hand, or coin for scale reference</li>
                  <li>For beverages, show the container to indicate volume</li>
                  <li>Optional description fields below each entry improve AI recognition accuracy</li>
                </ul>
              </Card>
            </div>

            <Card>
              <div className="p-5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200">
                <div>
                  <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold">Food Entries</div>
                  <div className="text-xs text-stone-500 mt-0.5">{entries.length} total · {entries.filter(e => e.photo).length} with photo · {entries.filter(e => !e.foodId && !e.components && (e.photo || e.description)).length} awaiting AI scan · {entries.filter(e => e.components).length} with ingredient breakdown</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={stubAnalyzePhotos} disabled={aiScanning} className="flex items-center gap-2 bg-purple-50 text-purple-800 px-4 py-2 text-sm font-medium rounded-full border border-purple-200 hover:bg-purple-100 disabled:opacity-60 disabled:cursor-wait transition" title="Analyze photos and descriptions with Claude vision">
                    <Wand2 size={14} className={aiScanning ? 'animate-spin' : ''} /> {aiScanning ? 'Analyzing…' : 'AI Scan Photos'}
                  </button>
                  <button onClick={addEntry} className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 text-sm font-medium rounded-full hover:bg-emerald-800 transition shadow-sm">
                    <Plus size={14} /> Add Food
                  </button>
                </div>
              </div>
              <div className="divide-y divide-stone-100">
                {entries.map(e => {
                  const food = FOOD_DB.find(f => f.id === e.foodId);
                  const cat = food ? COLOR_CATEGORIES[food.color] : null;
                  return (
                    <div key={e.id} className="p-4 hover:bg-orange-50/30 transition">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-1 flex justify-center">
                          {cat && <div className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-sm" style={{ background: cat.hex }} title={cat.label} />}
                        </div>
                        <div className="col-span-4">
                          <select value={e.foodId} onChange={ev=>updateEntry(e.id,'foodId',ev.target.value)} disabled={!!e.components} className="w-full border border-stone-200 px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 disabled:bg-stone-100 disabled:text-stone-500">
                            <option value="">— Select a food (or use photo / AI scan) —</option>
                            {FOOD_DB.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <input type="number" min="0" value={e.portionG} onChange={ev=>updateEntry(e.id,'portionG',Number(ev.target.value))} disabled={!!e.components} className="w-full border border-stone-200 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 disabled:bg-stone-100" />
                            <span className="text-xs text-stone-500">g/ml</span>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <select value={e.meal} onChange={ev=>updateEntry(e.id,'meal',ev.target.value)} className="w-full border border-stone-200 px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500">
                            <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
                          </select>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          {e.photo ? (
                            <div className="relative group">
                              <img src={e.photo} alt="meal" className="w-14 h-14 object-cover rounded-lg border border-stone-200 shadow-sm" />
                              <button onClick={()=>updateEntry(e.id,'photo',null)} className="absolute -top-1.5 -right-1.5 bg-stone-900 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition" title="Remove photo">
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex flex-col items-center justify-center w-14 h-14 border border-dashed border-stone-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/50 transition" title="Add photo">
                              <Camera size={16} strokeWidth={1.5} className="text-stone-400" />
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={ev=>handlePhotoUpload(e.id, ev.target.files?.[0])} />
                            </label>
                          )}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button onClick={()=>removeEntry(e.id)} className="text-stone-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full transition">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Components controls */}
                      <div className="mt-3 ml-12">
                        {!e.components ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <button onClick={()=>customizeComponents(e.id)} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-stone-300 text-stone-700 hover:border-emerald-500 hover:text-emerald-700 transition">
                              <ListTree size={12} /> Break into ingredients
                            </button>
                            <span className="text-stone-400">or load preset:</span>
                            {Object.keys(COMPOSITE_DISHES).map(cid => (
                              <button key={cid} onClick={()=>applyComposite(e.id, cid)} className="px-2.5 py-1 rounded-full border border-stone-200 text-stone-600 hover:border-emerald-400 hover:text-emerald-700 transition">
                                {COMPOSITE_DISHES[cid].label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-[11px] tracking-[0.15em] uppercase text-emerald-800 font-semibold flex items-center gap-1.5"><ListTree size={12} /> Ingredients ({e.components.length})</div>
                              <button onClick={()=>collapseComponents(e.id)} className="text-xs text-stone-500 hover:text-rose-600 underline">Use single food instead</button>
                            </div>
                            <div className="space-y-1.5">
                              {e.components.map((c, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                  <select value={c.foodId} onChange={ev=>updateComponent(e.id, idx, 'foodId', ev.target.value)} className="col-span-7 border border-stone-200 px-2.5 py-1.5 text-xs bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-200 focus:border-emerald-500">
                                    {FOOD_DB.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                  </select>
                                  <div className="col-span-3 flex items-center gap-1.5">
                                    <input type="number" min="0" value={c.g} onChange={ev=>updateComponent(e.id, idx, 'g', Number(ev.target.value))} className="w-full border border-stone-200 px-2.5 py-1.5 text-xs rounded-md" />
                                    <span className="text-[10px] text-stone-500">g</span>
                                  </div>
                                  <div className="col-span-2 flex justify-end gap-1">
                                    <button onClick={()=>removeComponent(e.id, idx)} className="text-stone-400 hover:text-rose-600 p-1" title="Remove ingredient"><X size={12}/></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button onClick={()=>addComponent(e.id)} className="mt-2 flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium">
                              <Plus size={12} /> Add ingredient
                            </button>
                          </div>
                        )}

                        {(e.photo || !e.foodId) && (
                          <input
                            type="text"
                            value={e.description}
                            onChange={ev=>updateEntry(e.id,'description',ev.target.value)}
                            placeholder={e.photo ? "Optional description (improves AI recognition) — e.g., mixed berry oatmeal with almonds" : "Describe this food in your own words — useful when no food is selected and no photo is uploaded"}
                            className="mt-2 w-full text-xs border border-stone-200 px-3 py-2 rounded-lg bg-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-5 bg-orange-50/40 border-t border-stone-200 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-stone-600">Once you've logged your full 24-hour intake, view your results or contribute anonymously to the cohort analysis.</div>
                <div className="flex gap-2.5">
                  <button onClick={()=>setTab('results')} className="px-5 py-2 text-sm font-medium rounded-full border border-emerald-700 text-emerald-700 hover:bg-emerald-700 hover:text-white transition">
                    View Results <ChevronRight size={13} className="inline ml-0.5" />
                  </button>
                  <button onClick={submitToCohort} className="px-5 py-2 text-sm font-medium rounded-full bg-stone-900 text-white hover:bg-stone-700 transition">
                    {submitted ? '✓ Submitted' : 'Submit to Cohort'}
                  </button>
                </div>
              </div>
            </Card>

            {/* AI ERROR BANNER */}
            {aiError && (
              <Card className="p-5 mt-4 bg-rose-50 border-rose-200">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-rose-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-rose-900">AI scan failed</div>
                    <div className="text-xs text-rose-800 mt-1 leading-relaxed">{aiError}</div>
                    <div className="text-xs text-rose-700 mt-2">
                      Common causes: missing <code className="px-1 bg-rose-100 rounded">ANTHROPIC_API_KEY</code>, photos too large, or network issue. Check the terminal where <code className="px-1 bg-rose-100 rounded">vercel dev</code> is running for details.
                    </div>
                  </div>
                  <button onClick={()=>setAiError(null)} className="text-rose-400 hover:text-rose-700 p-1"><X size={14}/></button>
                </div>
              </Card>
            )}

            {/* AI REVIEW MODAL */}
            {aiResults && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm" onClick={()=>setAiResults(null)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={ev=>ev.stopPropagation()}>
                  <div className="p-6 border-b border-stone-200 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-purple-800 mb-1">
                        <Wand2 size={16} />
                        <span className="text-[10px] tracking-[0.2em] uppercase font-semibold">AI Vision Analysis · Review</span>
                      </div>
                      <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold">{aiResults.entries?.length || 0} entr{aiResults.entries?.length === 1 ? 'y' : 'ies'} analyzed</div>
                      <div className="text-xs text-stone-500 mt-1">
                        Review the AI's suggestions below. Apply will replace your current entries with the AI's matches; you can still edit afterward.
                        {aiResults._meta && (
                          <span className="ml-2 text-stone-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            · {aiResults._meta.model} · {aiResults._meta.inputTokens}+{aiResults._meta.outputTokens} tok
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={()=>setAiResults(null)} className="text-stone-400 hover:text-stone-700 p-1"><X size={20}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {(aiResults.entries || []).map(aiEntry => {
                      const orig = entries.find(e => e.id === aiEntry.originalEntryId);
                      return (
                        <div key={aiEntry.originalEntryId} className="border border-stone-200 rounded-xl overflow-hidden">
                          <div className="bg-stone-50 px-4 py-3 flex items-center gap-3 border-b border-stone-200">
                            {orig?.photo && <img src={orig.photo} alt="" className="w-12 h-12 object-cover rounded-md" />}
                            <div className="flex-1">
                              <div className="text-xs text-stone-500">Original entry · {orig?.meal || 'Unknown'}</div>
                              <div className="text-sm font-medium text-stone-800">{orig?.description || '(no description)'} · {orig?.portionG}g</div>
                            </div>
                            <div className="text-xs text-stone-500">{aiEntry.matches?.length || 0} match{aiEntry.matches?.length === 1 ? '' : 'es'}</div>
                          </div>
                          {aiEntry.notes && (
                            <div className="px-4 py-2 text-xs italic text-stone-600 bg-amber-50/50 border-b border-stone-200">{aiEntry.notes}</div>
                          )}
                          {(!aiEntry.matches || aiEntry.matches.length === 0) ? (
                            <div className="p-4 text-sm text-stone-500 italic">No foods identified for this entry.</div>
                          ) : (
                            <div className="divide-y divide-stone-100">
                              {aiEntry.matches.map((m, idx) => {
                                const food = FOOD_DB.find(f => f.id === m.foodId);
                                const conf = m.confidence ?? 0;
                                const confColor = conf >= 0.8 ? '#5B8C3E' : conf >= 0.5 ? '#E89422' : '#C73E3E';
                                const confLabel = conf >= 0.8 ? 'high' : conf >= 0.5 ? 'medium' : 'low';
                                return (
                                  <div key={idx} className="p-4">
                                    <div className="flex items-start gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-stone-900">{food?.name || m.name || '(unmatched)'}</span>
                                          <span className="text-xs text-stone-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(m.portionG)}g</span>
                                          {m.invalid && <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">Invalid foodId — needs manual fix</span>}
                                        </div>
                                        {m.reasoning && (
                                          <div className="text-xs text-stone-600 mt-1 leading-relaxed italic">"{m.reasoning}"</div>
                                        )}
                                        {m.alternatives && m.alternatives.length > 0 && (
                                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span className="text-[10px] uppercase tracking-wide text-stone-500 font-semibold">Alternatives:</span>
                                            {m.alternatives.map((alt, i) => (
                                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                                                {FOOD_DB.find(f => f.id === alt.foodId)?.name || alt.name} ({(alt.confidence*100).toFixed(0)}%)
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="text-[10px] uppercase tracking-wide text-stone-500 font-semibold mb-1">Confidence</div>
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-16 h-2 bg-stone-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${conf*100}%`, background: confColor }} />
                                          </div>
                                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: confColor }} className="text-xs font-semibold">{(conf*100).toFixed(0)}%</span>
                                        </div>
                                        <div className="text-[10px] text-stone-500 mt-0.5 text-right">{confLabel}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
                    <div className="text-xs text-stone-600">
                      <strong>Heads up:</strong> Applying replaces matched entries with the AI's suggestions. You can edit them afterward.
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>setAiResults(null)} className="px-4 py-2 text-sm font-medium rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 transition">
                        Cancel
                      </button>
                      <button onClick={applyAiResults} className="px-5 py-2 text-sm font-medium rounded-full bg-emerald-700 text-white hover:bg-emerald-800 transition shadow-sm">
                        Apply suggestions
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== RESULTS TAB ========== */}
        {tab === 'results' && (
          <div>
            <SectionHeading
              eyebrow="Phase 01 · Individual Analysis"
              title="Your color pigment intake."
              sub={`Analysis of ${entries.length} food entries (${entries.filter(e => e.components).length} with ingredient-level decomposition) reported in your 24-hour recall, mapped to the USDA Flavonoid Database (Release 3.3) and Khoo et al. 2017 color categories.`}
            />

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              <Card className="p-6" accent="#7B3F9E">
                <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">ChromaDiet Score</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-5xl font-medium mt-2 text-stone-900">{analysis.totalScore}<span className="text-xl text-stone-400 ml-1">/100</span></div>
                <div className="text-xs text-stone-600 mt-2">Composite evidence-based score</div>
              </Card>
              <Card className="p-6" accent="#A0522D">
                <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Total Flavonoids</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-5xl font-medium mt-2 text-stone-900">{analysis.totalMg.toFixed(0)}<span className="text-xl text-stone-400 ml-1">mg</span></div>
                <div className="text-xs text-stone-600 mt-2">vs. NHANES mean ~198 mg/day</div>
              </Card>
              <Card className="p-6" accent="#5B8C3E">
                <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Classes Present</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-5xl font-medium mt-2 text-stone-900">{analysis.classesPresent}<span className="text-xl text-stone-400 ml-1">/6</span></div>
                <div className="text-xs text-stone-600 mt-2">USDA flavonoid classes</div>
              </Card>
              <Card className="p-6" accent="#E89422">
                <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Color Categories</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-5xl font-medium mt-2 text-stone-900">{analysis.colorsPresent}<span className="text-xl text-stone-400 ml-1">/5</span></div>
                <div className="text-xs text-stone-600 mt-2">Khoo Table 1 color groups</div>
              </Card>
            </div>

            {/* Sufficiency band */}
            <Card className="p-6 mb-5">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Sufficiency vs. Research-Suggested Targets</div>
                <button onClick={()=>setOpenHelp(openHelp==='cutpoints'?null:'cutpoints')} className="text-xs text-emerald-700 hover:underline flex items-center gap-1"><HelpCircle size={12}/> What are these?</button>
              </div>
              <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-1">Figure 1. Intake against suggested daily thresholds</div>
              {openHelp === 'cutpoints' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-stone-700 my-3 leading-relaxed">
                  <strong>About these targets:</strong> Unlike vitamins, flavonoids do not have formal Recommended Daily Allowances. The values shown are <em>research-suggested</em> intakes derived from observational cohorts and a small number of randomized trials linking specific intake levels to specific health outcomes. Two classes (flavanones, flavones) have no validated daily target in the literature. Treat these as educational reference points, not clinical guidance.
                </div>
              )}
              <div className="space-y-3 mt-3">
                {Object.keys(FLAVONOID_CLASSES).map(c => {
                  const cls = FLAVONOID_CLASSES[c];
                  const suff = analysis.sufficiency[c];
                  const cp = CUT_POINTS[c];
                  const intake = analysis.flavTotals[c];
                  const target = cp?.value;
                  const pct = target ? Math.min((intake / target) * 100, 130) : 0;
                  return (
                    <div key={c}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: cls.color }} />
                          <span className="font-medium text-stone-800">{cls.label}</span>
                          {suff.status === 'sufficient' && <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 size={11}/> sufficient</span>}
                          {suff.status === 'below' && <span className="text-amber-700">below target ({intake.toFixed(1)} / {target} mg)</span>}
                          {suff.status === 'absent' && <span className="text-rose-700 flex items-center gap-1"><MinusCircle size={11}/> not detected</span>}
                          {suff.status === 'no_target' && <span className="text-stone-500 italic">no validated target</span>}
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-stone-700">{intake.toFixed(1)} mg{target ? ` / ${target} mg` : ''}</div>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden relative">
                        {target && (
                          <>
                            <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: cls.color }} />
                            {pct > 100 && <div className="absolute inset-y-0 rounded-full" style={{ left: '100%', width: `${pct - 100}%`, background: cls.color, opacity: 0.5 }} />}
                          </>
                        )}
                      </div>
                      {target && (
                        <div className="text-[10px] text-stone-500 mt-1">Target source: {cp.source} · Outcome: {cp.outcome}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* MyPlate row */}
            <Card className="p-6 mb-5">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-1">Table 1. MyPlate Coverage</div>
              <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-3">Foods reported by U.S. Dietary Guideline group</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { key:'fruits', label:'Fruits', icon:Apple, color:'#C73E3E' },
                  { key:'vegetables', label:'Vegetables', icon:Carrot, color:'#5B8C3E' },
                  { key:'wholeGrains', label:'Whole Grains', icon:Wheat, color:'#A0522D' },
                  { key:'protein', label:'Protein', icon:Fish, color:'#7B3F9E' },
                  { key:'healthyFats', label:'Healthy Fats', icon:Droplet, color:'#D4A017' },
                ].map(g => {
                  const Icon = g.icon;
                  const count = analysis.myplateCounts[g.key] || 0;
                  return (
                    <div key={g.key} className="rounded-xl p-4 border border-stone-200 bg-white">
                      <Icon size={20} strokeWidth={1.5} style={{ color: g.color }} />
                      <div style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl mt-2 font-medium">{count}</div>
                      <div className="text-xs text-stone-600">{g.label}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Charts: Class bar + NHANES radar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              <Card className="p-6">
                <SubHeading label="Figure 2 · By flavonoid class" title="Six classes, six colors" hint="mg consumed today across the six USDA-defined flavonoid classes." />
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={classBarData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e9dc" />
                    <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: 'mg/day', position: 'insideBottom', offset: -5, fontSize: 10 }}/>
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={(v) => `${v} mg`} contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} />
                    <Bar dataKey="mg" radius={[0, 4, 4, 0]}>
                      {classBarData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <SubHeading label="Figure 3 · vs. U.S. national average" title="NHANES 2007–2008 comparison" hint="Your intake (purple) overlaid on U.S. adult population means (gray)." />
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e7e5e4" />
                    <PolarAngleAxis dataKey="class" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    <Radar name="You" dataKey="intake" stroke="#7B3F9E" fill="#7B3F9E" fillOpacity={0.4} />
                    <Radar name="NHANES Mean" dataKey="nhanes" stroke="#a8a29e" fill="#a8a29e" fillOpacity={0.15} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Charts: Color pie + meal stack */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              <Card className="p-6">
                <SubHeading label="Figure 4 · Pigment distribution" title="By Khoo color category" hint="Total pigment mass attributed to each of the five color groups (Khoo Table 1)." />
                {colorPieData.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={colorPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={100} label={(e)=>`${e.name}: ${e.value}mg`} labelLine={false}>
                        {colorPieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="text-stone-500 text-sm py-12 text-center">No pigment-bearing foods logged yet.</div>}
              </Card>

              <Card className="p-6">
                <SubHeading label="Figure 5 · By meal occasion" title="When you got your pigments" hint="mg/day stacked by flavonoid class across each meal." />
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mealStackData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e9dc" />
                    <XAxis dataKey="meal" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: 'mg', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    {Object.keys(FLAVONOID_CLASSES).map(k => (
                      <Bar key={k} dataKey={FLAVONOID_CLASSES[k].label} stackId="a" fill={FLAVONOID_CLASSES[k].color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* SOURCES — Where each pigment is coming from */}
            <Card className="p-6 mb-5">
              <SubHeading label="Figure 6 · Pigment sources" title="Where each pigment is coming from" hint="For each flavonoid class with non-zero intake, the foods (or ingredients within composite dishes) contributing the pigment, ranked by mg." />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.keys(FLAVONOID_CLASSES).map(c => {
                  const sources = analysis.sources[c];
                  const total = analysis.flavTotals[c];
                  if (total === 0) {
                    return (
                      <div key={c} className="rounded-xl p-4 border border-dashed border-stone-200 bg-stone-50/60">
                        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: FLAVONOID_CLASSES[c].color }}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: FLAVONOID_CLASSES[c].color }} />
                          {FLAVONOID_CLASSES[c].label}
                        </div>
                        <div className="text-xs text-stone-500 mt-2 italic">No data recorded — none of today's foods contain this class above the database threshold. Try {c === 'isoflavones' ? 'soy products (tofu, edamame, soymilk)' : c === 'flavones' ? 'parsley or celery' : c === 'flavanones' ? 'citrus fruits' : 'a wider variety of plant foods'}.</div>
                      </div>
                    );
                  }
                  return (
                    <div key={c} className="rounded-xl p-4 border border-stone-200 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: FLAVONOID_CLASSES[c].color }}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: FLAVONOID_CLASSES[c].color }} />
                          {FLAVONOID_CLASSES[c].label}
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xs text-stone-700 font-medium">{total.toFixed(1)} mg total</div>
                      </div>
                      <div className="space-y-1.5">
                        {sources.slice(0, 5).map(s => {
                          const pct = (s.mg / total) * 100;
                          return (
                            <div key={s.foodId} className="text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-stone-700">{s.name}</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-stone-500">{s.mg.toFixed(1)} mg ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mt-0.5">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: FLAVONOID_CLASSES[c].color, opacity: 0.6 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Fruit/Veg breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <Card className="p-6">
                <SubHeading label="Table 2 · Fruits by color" title={`${analysis.fruitCount} fruits logged`} hint="Counts grouped by Khoo color category." />
                <div className="space-y-2">
                  {Object.keys(COLOR_CATEGORIES).map(c => (
                    <div key={c} className="flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg bg-stone-50">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLOR_CATEGORIES[c].hex }} />
                      <div className="flex-1 text-stone-700">{COLOR_CATEGORIES[c].label}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="font-medium">{analysis.fruitColorCounts[c]}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6">
                <SubHeading label="Table 3 · Vegetables by color" title={`${analysis.vegCount} vegetables logged`} hint="Counts grouped by Khoo color category." />
                <div className="space-y-2">
                  {Object.keys(COLOR_CATEGORIES).map(c => (
                    <div key={c} className="flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg bg-stone-50">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLOR_CATEGORIES[c].hex }} />
                      <div className="flex-1 text-stone-700">{COLOR_CATEGORIES[c].label}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="font-medium">{analysis.vegColorCounts[c]}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Health benefits + gaps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-1">
                  <SubHeading label="Table 4 · Health benefit alignment" title="From Khoo 2017, Tables 2–3" hint="Benefits linked to the classes you actually consumed today." />
                  <button onClick={()=>setOpenHelp(openHelp==='hbkey'?null:'hbkey')} className="text-xs text-emerald-700 hover:underline flex items-center gap-1"><HelpCircle size={12}/> Glossary</button>
                </div>
                <div className="space-y-3">
                  {Object.keys(FLAVONOID_CLASSES).map(k => {
                    const mg = analysis.flavTotals[k];
                    if (mg === 0) return null;
                    const benefitIds = CLASS_BENEFITS[k] || [];
                    return (
                      <div key={k} className="border-l-2 pl-4 py-1" style={{ borderColor: FLAVONOID_CLASSES[k].color }}>
                        <div className="flex items-baseline justify-between">
                          <div className="font-medium text-sm">{FLAVONOID_CLASSES[k].label}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xs text-stone-500">{mg.toFixed(1)} mg</div>
                        </div>
                        <div className="text-xs text-stone-600 leading-relaxed mt-1">
                          {benefitIds.map((bid, i) => (
                            <span key={bid}>
                              {i > 0 && ' · '}
                              <span className="hover:underline cursor-help" title={HEALTH_BENEFITS_KEY[bid].desc}>
                                {HEALTH_BENEFITS_KEY[bid].label}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-6" style={{ background: 'linear-gradient(135deg, #FFF6E6 0%, #FCEEDA 100%)' }}>
                <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-amber-800 font-semibold mb-1"><AlertCircle size={12} /> Gaps & opportunities</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-1">Missing color pigments</div>
                <div className="text-xs text-stone-600 mb-3 italic">"No data recorded" means none of today's logged foods contain that pigment above the USDA database threshold — not that the pigment itself is missing from the food universe.</div>
                {analysis.missingClasses.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs uppercase tracking-wide text-stone-600 font-medium mb-2">Flavonoid classes absent today</div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missingClasses.map(c => (
                        <div key={c} className="px-3 py-1 text-xs rounded-full border border-stone-300 bg-white">{FLAVONOID_CLASSES[c].label}</div>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.missingColors.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-stone-600 font-medium mb-2">Color categories absent today</div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missingColors.map(c => (
                        <div key={c} className="px-3 py-1 text-xs rounded-full border border-stone-300 bg-white flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: COLOR_CATEGORIES[c].hex }} />
                          {COLOR_CATEGORIES[c].label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.missingClasses.length === 0 && analysis.missingColors.length === 0 && (
                  <div className="text-sm text-stone-700 leading-relaxed">All six flavonoid classes and all five color categories are represented in your 24-hour recall.</div>
                )}
              </Card>
            </div>

            {/* Health benefit glossary (collapsible) */}
            {openHelp === 'hbkey' && (
              <Card className="p-6 mb-5">
                <SubHeading label="Glossary" title="Health benefit definitions" hint="Plain-language explanations for each clinical term used above. Click anywhere to close." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" onClick={()=>setOpenHelp(null)}>
                  {Object.keys(HEALTH_BENEFITS_KEY).map(bid => (
                    <div key={bid} className="border border-stone-200 rounded-lg p-3 bg-white hover:shadow-sm cursor-pointer">
                      <div className="font-medium text-sm text-stone-900">{HEALTH_BENEFITS_KEY[bid].label}</div>
                      <div className="text-xs text-stone-600 mt-1 leading-relaxed">{HEALTH_BENEFITS_KEY[bid].desc}</div>
                      <div className="text-[10px] text-emerald-700 mt-2">{HEALTH_BENEFITS_KEY[bid].refs.join(' · ')}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Score breakdown */}
            <Card className="p-6 mb-5">
              <SubHeading label="Score Decomposition" title="Transparent algorithm" hint="Each component of your ChromaDiet score, explained." />
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  { label:'Class diversity', val: analysis.breakdown.diversityScore, max:30, note:'6 USDA classes' },
                  { label:'Color coverage', val: analysis.breakdown.colorScore, max:25, note:'5 Khoo categories' },
                  { label:'Total intake', val: analysis.breakdown.intakeScore, max:20, note:'vs. NHANES' },
                  { label:'MyPlate adherence', val: analysis.breakdown.myplateScore, max:15, note:'5 food groups' },
                  { label:'Anthocyanin sufficiency', val: analysis.breakdown.anthoScore, max:10, note:'Khoo threshold' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3.5 border border-stone-200 bg-white">
                    <div className="text-xs text-stone-600">{s.label}</div>
                    <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-medium mt-1">{s.val.toFixed(1)}<span className="text-sm text-stone-400">/{s.max}</span></div>
                    <div className="text-[10px] text-stone-500 mt-1">{s.note}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex flex-wrap gap-3 justify-end">
              <button onClick={exportReport} className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full border border-emerald-700 text-emerald-700 hover:bg-emerald-700 hover:text-white transition">
                <Download size={14} /> Export Report (JSON)
              </button>
            </div>
          </div>
        )}

        {/* ========== COHORT TAB ========== */}
        {tab === 'cohort' && (
          <div>
            <SectionHeading
              eyebrow="Aggregate · All Participants"
              title="Cohort intake patterns."
              sub="Anonymous aggregated data from all submissions stored in this browser. Filter by demographic sub-group below. For multi-device research deployments, swap the localStorage layer for a backend (Supabase, Firebase, or custom API)."
            />

            {/* Sub-group filter */}
            <Card className="p-5 mb-5">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3"><Filter size={12} /> Sub-group filter</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-stone-600 mb-1">Age range</label>
                  <select value={cohortFilter.ageRange} onChange={e=>setCohortFilter({...cohortFilter, ageRange:e.target.value})} className="w-full border border-stone-300 px-3 py-2 text-sm bg-white rounded-lg">
                    {cohortFilterOptions.ageRanges.map(o => <option key={o} value={o}>{o === 'all' ? 'All' : o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-600 mb-1">Sex</label>
                  <select value={cohortFilter.sex} onChange={e=>setCohortFilter({...cohortFilter, sex:e.target.value})} className="w-full border border-stone-300 px-3 py-2 text-sm bg-white rounded-lg">
                    {cohortFilterOptions.sexes.map(o => <option key={o} value={o}>{o === 'all' ? 'All' : o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-600 mb-1">Cohort code</label>
                  <select value={cohortFilter.cohortCode} onChange={e=>setCohortFilter({...cohortFilter, cohortCode:e.target.value})} className="w-full border border-stone-300 px-3 py-2 text-sm bg-white rounded-lg">
                    {cohortFilterOptions.cohortCodes.map(o => <option key={o} value={o}>{o === 'all' ? 'All' : o}</option>)}
                  </select>
                </div>
              </div>
              <div className="text-xs text-stone-500 mt-3">{filteredCohort.length} of {cohort.length} submissions match the current filter.</div>
            </Card>

            {cohortLoading ? (
              <div className="text-stone-500 text-sm text-center py-12">Loading cohort data…</div>
            ) : !cohortStats ? (
              <Card className="p-12 text-center">
                <Users size={32} strokeWidth={1.2} className="mx-auto text-stone-400 mb-4" />
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl mb-2 font-medium">{cohort.length === 0 ? 'No submissions yet' : 'No matches for this filter'}</div>
                <p className="text-sm text-stone-600 max-w-md mx-auto">{cohort.length === 0 ? 'Once participants submit their 24-hour recalls, aggregate statistics will appear here in real time.' : 'Try widening the sub-group filter above.'}</p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  <Card className="p-6" accent="#7B3F9E">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Participants</div>
                    <div style={{ fontFamily: 'Fraunces, serif' }} className="text-5xl font-medium mt-2 text-stone-900">{cohortStats.n}</div>
                    <div className="text-xs text-stone-600 mt-2">{cohort.length === cohortStats.n ? 'all participants' : `filtered from ${cohort.length}`}</div>
                  </Card>
                  <Card className="p-6" accent="#5B8C3E">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Mean ChromaDiet Score</div>
                    <div style={{ fontFamily: 'Fraunces, serif' }} className="text-5xl font-medium mt-2 text-stone-900">{cohortStats.meanScore.toFixed(1)}<span className="text-xl text-stone-400">/100</span></div>
                  </Card>
                  <Card className="p-6" accent="#E89422">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Mean Total Flavonoids</div>
                    <div style={{ fontFamily: 'Fraunces, serif' }} className="text-5xl font-medium mt-2 text-stone-900">{Object.values(cohortStats.means).reduce((a,b)=>a+b,0).toFixed(0)}<span className="text-xl text-stone-400">mg</span></div>
                  </Card>
                </div>

                <Card className="p-6 mb-5">
                  <SubHeading label="Figure 7 · Cohort vs. NHANES" title="Mean intake by flavonoid class" hint="Filtered cohort means (purple) compared to NHANES 2007–2008 U.S. adult means (gray)." />
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={Object.keys(FLAVONOID_CLASSES).map(k => ({
                      name: FLAVONOID_CLASSES[k].label,
                      Cohort: Number(cohortStats.means[k].toFixed(2)),
                      NHANES: NHANES_MEAN[k],
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0e9dc" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} label={{ value: 'mg/day', angle: -90, position: 'insideLeft', fontSize: 10 }}/>
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="Cohort" fill="#7B3F9E" radius={[4,4,0,0]} />
                      <Bar dataKey="NHANES" fill="#a8a29e" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <div className="flex justify-end">
                  <button onClick={clearCohort} className="text-xs text-stone-500 hover:text-rose-600 underline">Clear local cohort data</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========== PHASE 2 TAB ========== */}
        {tab === 'phase2' && (
          <div>
            <SectionHeading
              eyebrow="Phase 02 · Coming Soon"
              title="Beyond color: flavor, aroma, taste & texture."
              sub="Phase 2 will extend the analyzer to other food sensory properties using established scientific databases."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name:'FlavorDB', desc:'Comprehensive database of flavor molecules and their food sources, supporting flavor profiling and pairing analysis.' },
                { name:'FooDB', desc:'Detailed compositional data on macro- and micro-nutrients and food chemistry across thousands of foods.' },
                { name:'BitterDB', desc:'Database of bitter taste compounds, supporting bitterant identification and receptor analysis.' },
                { name:'IDDSI Texture Framework', desc:'Standardized food and drink texture descriptors for clinical and research applications.' },
              ].map(db => (
                <Card key={db.name} className="p-6">
                  <div className="flex items-start gap-3 mb-2">
                    <FlaskConical size={20} strokeWidth={1.5} className="text-emerald-700 mt-1" />
                    <div>
                      <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium">{db.name}</div>
                      <div className="inline-block mt-1 text-[10px] tracking-[0.2em] uppercase text-amber-800 font-semibold">Integration planned</div>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed mt-2">{db.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========== METHODS TAB ========== */}
        {tab === 'methods' && (
          <div>
            <SectionHeading
              eyebrow="Methods, Data Sources & Limitations"
              title="The science behind the score."
              sub="ChromaDiet integrates four authoritative sources. All values, categories, and benefit linkages are traceable to peer-reviewed literature or USDA databases. Click any section heading to expand details."
            />

            {/* PRIMARY REFERENCES */}
            <Card className="p-6 mb-4">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-4">Primary References</div>
              <ol className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">USDA Database for the Flavonoid Content of Selected Foods, Release 3.3 (2018)</div>
                    <div className="text-stone-600 text-xs mt-1">Defines six flavonoid classes and 29 individual compounds. All mg/100g values in ChromaDiet derive from this database.</div>
                    <a href="https://www.ars.usda.gov/ARSUserFiles/80400535/Data/Flav/Flav3.3.pdf" target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-medium underline inline-flex items-center gap-1 mt-1">View source <ExternalLink size={11} /></a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Khoo HE, Azlan A, Tang ST, Lim SM. <em>Anthocyanidins and anthocyanins: colored pigments as food, pharmaceutical ingredients, and the potential health benefits.</em> Food Nutr Res. 2017;61:1361779.</div>
                    <div className="text-stone-600 text-xs mt-1">Source for color category mapping (Table 1) and pigment-to-health-benefit linkages (Tables 2 and 3). The cross-reference Tables 4–12 in the original article describe specific intervention/cohort findings — these inform our cut-points and benefit descriptions.</div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5613902/" target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-medium underline inline-flex items-center gap-1">PMC version <ExternalLink size={11} /></a>
                      <a href="https://www.tandfonline.com/doi/full/10.1080/16546628.2017.1361779" target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-medium underline inline-flex items-center gap-1">Publisher version <ExternalLink size={11} /></a>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">USDA NHANES Flavonoid Intake Tables, 2007–2008</div>
                    <div className="text-stone-600 text-xs mt-1">Population reference values for U.S. adult flavonoid intake. Used for the radar comparison and the intake-score component.</div>
                    <a href="https://www.ars.usda.gov/ARSUserFiles/80400530/pdf/0708/flav_tables_1-4_2007-2008.pdf" target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-medium underline inline-flex items-center gap-1 mt-1">View source <ExternalLink size={11} /></a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">USDA MyPlate / U.S. Dietary Guidelines for Americans</div>
                    <div className="text-stone-600 text-xs mt-1">Five food group classifications used for the MyPlate Coverage card.</div>
                    <a href="https://www.myplate.gov/" target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-medium underline inline-flex items-center gap-1 mt-1">View source <ExternalLink size={11} /></a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Bondonno NP et al. <em>Flavonoid intake is associated with lower mortality in the Danish Diet Cancer and Health Cohort.</em> Nat Commun. 2019;10:3651.</div>
                    <div className="text-stone-600 text-xs mt-1">Provides the basis for the ≥500 mg/day total flavonoid and ≥10 mg/day flavonol cut-points associated with reduced cardiovascular mortality.</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Sesso HD et al. (COSMOS Trial). <em>Effect of cocoa flavanol supplementation for the prevention of cardiovascular disease events.</em> Am J Clin Nutr. 2022;115(6):1490–1500.</div>
                    <div className="text-stone-600 text-xs mt-1">Provides the ≥400 mg/day flavan-3-ol cut-point associated with cardiovascular outcomes.</div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">NIH Office of Dietary Supplements — Soy Isoflavones Fact Sheet</div>
                    <div className="text-stone-600 text-xs mt-1">Provides the basis for the ≥25 mg/day isoflavone reference range associated with menopausal and bone health outcomes.</div>
                  </div>
                </li>
              </ol>
            </Card>

            {/* CALCULATIONS */}
            <Card className="p-6 mb-4">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3">How calculations work</div>
              <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-3">From food entry to score</div>
              <div className="space-y-4 text-sm text-stone-700">
                <div>
                  <div className="font-medium text-stone-900 mb-1">1 · Ingredient resolution</div>
                  <p className="leading-relaxed">If an entry has a Components list (composite dish), each ingredient is processed independently with its own gram weight. If not, the single foodId × portionG is used. This ensures a "kale-cranberry-walnut salad" gets pigment contributions from each ingredient, not just kale.</p>
                </div>
                <div>
                  <div className="font-medium text-stone-900 mb-1">2 · Pigment computation</div>
                  <p className="leading-relaxed">For each ingredient: <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xs bg-stone-100 px-1.5 py-0.5 rounded">mg = USDA_value(per_100g) × (grams ÷ 100)</span>. Values are summed across ingredients and entries to produce daily class totals.</p>
                </div>
                <div>
                  <div className="font-medium text-stone-900 mb-1">3 · Color category attribution</div>
                  <p className="leading-relaxed">Each USDA single-food has a single color tag (Khoo Table 1). Pigment mass from each ingredient is added to that color's bucket. MyPlate group counts and fruit/vegetable counts use the <em>parent entry</em> only, to avoid double-counting (a salad counts as 1 vegetable dish, not 4).</p>
                </div>
                <div>
                  <div className="font-medium text-stone-900 mb-1">4 · ChromaDiet score formula</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="bg-stone-50 p-4 text-xs leading-relaxed border border-stone-200 rounded-lg mt-2">
                    Score = (classes_present / 6) × 30<br/>
                    {'      '}+ (colors_present / 5) × 25<br/>
                    {'      '}+ min(total_mg / NHANES_total, 1) × 20<br/>
                    {'      '}+ (myplate_groups_hit / 5) × 15<br/>
                    {'      '}+ min(anthocyanidin_mg / 25, 1) × 10
                  </div>
                </div>
                <div>
                  <div className="font-medium text-stone-900 mb-1">5 · Sufficiency band</div>
                  <p className="leading-relaxed">For each class, intake is compared against a research-suggested target (where one exists in the literature). Status is one of: sufficient (≥ target), below (0 &lt; intake &lt; target), absent (intake = 0), or no validated target.</p>
                </div>
              </div>
            </Card>

            {/* SUFFICIENCY CUT-POINTS */}
            <Card className="p-6 mb-4">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3">Sufficiency cut-points used in the analyzer</div>
              <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-1">Research-suggested daily intake guides</div>
              <p className="text-xs text-stone-600 mb-4 leading-relaxed">These are not formal RDAs. They are observational or trial-derived intake levels associated with specific health outcomes in the cited research.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-stone-200">
                      <th className="py-2 pr-4 font-medium text-stone-700 text-xs uppercase tracking-wide">Class</th>
                      <th className="py-2 pr-4 font-medium text-stone-700 text-xs uppercase tracking-wide">Target</th>
                      <th className="py-2 pr-4 font-medium text-stone-700 text-xs uppercase tracking-wide">Outcome</th>
                      <th className="py-2 font-medium text-stone-700 text-xs uppercase tracking-wide">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(CUT_POINTS).map(c => (
                      <tr key={c} className="border-b border-stone-100">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: FLAVONOID_CLASSES[c].color }} />
                            <span className="font-medium">{FLAVONOID_CLASSES[c].label}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-stone-700" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                          {CUT_POINTS[c].value !== null ? `≥ ${CUT_POINTS[c].value} mg/day` : '—'}
                        </td>
                        <td className="py-2 pr-4 text-stone-700 text-xs">{CUT_POINTS[c].outcome}</td>
                        <td className="py-2 text-stone-600 text-xs">{CUT_POINTS[c].source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-stone-600 mt-4 leading-relaxed italic">For flavanones and flavones, no validated daily intake target has been established in the literature. The analyzer reports intake but does not score these against a threshold.</p>
            </Card>

            {/* HEALTH BENEFIT KEY (always visible on Methods tab) */}
            <Card className="p-6 mb-4">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3">Key to health benefit terms</div>
              <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-3">Glossary</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.keys(HEALTH_BENEFITS_KEY).map(bid => (
                  <div key={bid} className="border border-stone-200 rounded-lg p-3 bg-white">
                    <div className="font-medium text-sm text-stone-900">{HEALTH_BENEFITS_KEY[bid].label}</div>
                    <div className="text-xs text-stone-600 mt-1 leading-relaxed">{HEALTH_BENEFITS_KEY[bid].desc}</div>
                    <div className="text-[10px] text-emerald-700 mt-2">{HEALTH_BENEFITS_KEY[bid].refs.join(' · ')}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* "NO DATA" INTERPRETATION */}
            <Card className="p-6 mb-4" style={{ background: 'linear-gradient(135deg, #FFF6E6 0%, #FCEEDA 100%)' }}>
              <div className="text-[10px] tracking-[0.2em] uppercase text-amber-800 font-semibold mb-3">How to read "no data recorded"</div>
              <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-3">Interpreting absence</div>
              <ul className="text-sm text-stone-700 space-y-2 list-disc pl-5 leading-relaxed">
                <li><strong>"No data recorded" (zero mg) for a class in your daily total</strong> means none of today's logged foods contain that class above the USDA database measurement threshold. It does <em>not</em> mean those compounds are biologically absent from your diet long-term.</li>
                <li><strong>Some foods (e.g., salmon, chicken, plain oats, brown rice) genuinely have negligible flavonoids.</strong> They appear in your log to support MyPlate analysis but contribute zero to pigment totals — this is correct, not a bug.</li>
                <li><strong>Database limits:</strong> USDA Flavonoid 3.3 covers ~500 foods. Less common foods (specialty cultivars, ethnic cuisines, processed mixtures) may not appear or may use a default value.</li>
                <li><strong>Cooking and processing</strong> can substantially alter flavonoid content. The reported values are typically for raw/minimally processed forms.</li>
              </ul>
            </Card>

            {/* LIMITATIONS */}
            <Card className="p-6 mb-4">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3">Limitations & caveats</div>
              <ul className="text-sm text-stone-700 space-y-2 list-disc pl-5">
                <li>24-hour recalls are subject to recall bias and may not reflect habitual intake.</li>
                <li>The embedded food reference dataset includes ~40 high-flavonoid foods plus 4 composite preset dishes; rare foods may not be represented.</li>
                <li>Flavonoid values vary by cultivar, ripeness, processing, and cooking method; reported values are means.</li>
                <li>Health benefit linkages are summarized from observational and mechanistic literature. Cell-line and animal studies are clearly labeled as such.</li>
                <li>Cohort persistence uses browser localStorage — data is local to this browser only. For multi-device studies, replace with a real backend.</li>
                <li>Phase 2 (flavor, aroma, texture, taste) is scaffolded but not yet active.</li>
                <li>The ChromaDiet score is not validated against clinical outcomes. It is an educational composite intended to illustrate dietary diversity in pigment intake, not a clinical risk-assessment tool.</li>
              </ul>
            </Card>

            {/* COMPOUNDS REFERENCE */}
            <Card className="p-6">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3">Six USDA flavonoid classes and their 29 compounds</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(FLAVONOID_CLASSES).map(k => (
                  <div key={k} className="border-l-2 pl-4" style={{ borderColor: FLAVONOID_CLASSES[k].color }}>
                    <div className="font-medium text-sm">{FLAVONOID_CLASSES[k].label}</div>
                    <div className="text-xs text-stone-600 mt-1 leading-relaxed">{FLAVONOID_CLASSES[k].compounds.join(', ')}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

      </main>

      <footer className="border-t border-stone-200 mt-12 py-8 px-6 md:px-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <Leaf size={12} strokeWidth={1.5} />
            <span><strong className="text-stone-700">ChromaDiet</strong> · Research Tool · For IRB-approved studies and educational use</span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>v0.4 · Phase 1 expanded</div>
        </div>
      </footer>
    </div>
  );
}
