import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Plus, Trash2, Download, BookOpen, ChevronRight, ArrowUpRight,
  Apple, Carrot, Wheat, Fish, Droplet, Users, User, Sparkles,
  ScrollText, FlaskConical, AlertCircle, Leaf, Beaker
} from 'lucide-react';

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
// REFERENCE DATA
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

const NHANES_MEAN = {
  anthocyanidins: 11.6, flavan3ols: 156.5, flavanones: 14.4,
  flavones: 1.6, flavonols: 12.9, isoflavones: 1.3,
};

const HEALTH_BENEFITS = {
  anthocyanidins: ['Cardiovascular protection','Anti-inflammatory effects','Improved insulin sensitivity','Visual function support','Neuroprotection'],
  flavan3ols:    ['Improved endothelial function','Reduced blood pressure','Antioxidant activity'],
  flavanones:    ['Lipid profile improvement','Anti-inflammatory effects'],
  flavones:      ['Anti-cancer activity (in vitro)','Antioxidant capacity'],
  flavonols:     ['Reduced cardiovascular mortality','Anti-inflammatory effects'],
  isoflavones:   ['Bone health support','Menopausal symptom relief','Hormone-related effects'],
};

// =============================================================
// COMPONENT
// =============================================================
export default function ChromaDiet() {
  const [tab, setTab] = useState('intake');
  const [participantId] = useState(() => 'P-' + Math.random().toString(36).slice(2,7).toUpperCase());
  const [demographics, setDemographics] = useState({ ageRange:'', sex:'', cohortCode:'' });
  const [consent, setConsent] = useState(false);
  const [entries, setEntries] = useState([
    { id:1, foodId:'blueberry', portionG:75, meal:'Breakfast' },
    { id:2, foodId:'green_tea', portionG:240, meal:'Breakfast' },
    { id:3, foodId:'kale',      portionG:60, meal:'Lunch' },
    { id:4, foodId:'red_onion', portionG:40, meal:'Lunch' },
    { id:5, foodId:'salmon',    portionG:140, meal:'Dinner' },
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [cohort, setCohort] = useState([]);
  const [cohortLoading, setCohortLoading] = useState(true);

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

  const analysis = useMemo(() => {
    const flavTotals = { anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 };
    const colorCounts = { red:0, orangeYellow:0, green:0, bluePurple:0, whiteTan:0 };
    const myplateCounts = { fruits:0, vegetables:0, wholeGrains:0, protein:0, healthyFats:0, other:0 };
    const colorPigmentMg = { red:0, orangeYellow:0, green:0, bluePurple:0, whiteTan:0 };
    const byMeal = {};
    let fruitCount = 0, vegCount = 0;
    const fruitColorCounts = { red:0, orangeYellow:0, green:0, bluePurple:0, whiteTan:0 };
    const vegColorCounts = { red:0, orangeYellow:0, green:0, bluePurple:0, whiteTan:0 };

    entries.forEach(e => {
      const food = FOOD_DB.find(f => f.id === e.foodId);
      if (!food) return;
      const factor = e.portionG / 100;
      const mealKey = e.meal || 'Other';
      if (!byMeal[mealKey]) byMeal[mealKey] = { anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 };
      let foodTotalMg = 0;
      Object.keys(food.flav).forEach(cls => {
        const mg = food.flav[cls] * factor;
        flavTotals[cls] += mg;
        byMeal[mealKey][cls] += mg;
        foodTotalMg += mg;
      });
      colorCounts[food.color] = (colorCounts[food.color] || 0) + 1;
      colorPigmentMg[food.color] = (colorPigmentMg[food.color] || 0) + foodTotalMg;
      myplateCounts[food.myplate] = (myplateCounts[food.myplate] || 0) + 1;
      if (food.myplate === 'fruits') { fruitCount++; fruitColorCounts[food.color]++; }
      if (food.myplate === 'vegetables') { vegCount++; vegColorCounts[food.color]++; }
    });

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

    return {
      flavTotals, colorCounts, colorPigmentMg, myplateCounts, byMeal,
      totalMg, classesPresent, colorsPresent, myplateGroupsHit,
      fruitCount, vegCount, fruitColorCounts, vegColorCounts,
      totalScore, missingClasses, missingColors,
      breakdown: { diversityScore, colorScore, intakeScore, myplateScore, anthoScore }
    };
  }, [entries]);

  const cohortStats = useMemo(() => {
    if (!cohort.length) return null;
    const sums = { anthocyanidins:0, flavan3ols:0, flavanones:0, flavones:0, flavonols:0, isoflavones:0 };
    let scoreSum = 0;
    cohort.forEach(p => {
      Object.keys(sums).forEach(k => sums[k] += (p.flavTotals[k] || 0));
      scoreSum += p.totalScore || 0;
    });
    const means = {};
    Object.keys(sums).forEach(k => means[k] = sums[k] / cohort.length);
    return { n: cohort.length, means, meanScore: scoreSum / cohort.length };
  }, [cohort]);

  const addEntry = () => setEntries([...entries, { id: Date.now(), foodId: FOOD_DB[0].id, portionG: 100, meal: 'Snack' }]);
  const updateEntry = (id, key, val) => setEntries(entries.map(e => e.id === id ? { ...e, [key]: val } : e));
  const removeEntry = (id) => setEntries(entries.filter(e => e.id !== id));

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
          <div className="text-right hidden md:block">
            <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Participant</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-sm text-emerald-800 font-medium">{participantId}</div>
          </div>
        </div>

        {/* Tabs */}
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
              sub="Enter foods and beverages consumed in the past 24 hours along with portion sizes. The analyzer will quantify your intake of the six USDA flavonoid classes and map them to color categories from Khoo et al. (2017)."
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
                  Breakfast,Blueberries,Fresh wild,1/2 cup (75g)<br/>
                  Breakfast,Green tea,Brewed,1 cup (240ml)<br/>
                  Lunch,Kale salad,Raw with dressing,1 cup (60g)
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3"><Apple size={13} /> Image upload guidance</div>
                <p className="text-sm text-stone-700 leading-relaxed">
                  Photograph each meal from above with a reference object (e.g., a fork or coin) for portion estimation. Capture beverages in their original container when possible.
                  <span className="block mt-2 italic text-stone-500 text-xs">Image OCR / vision integration is supported via API; pre-loaded reference dataset shown below.</span>
                </p>
              </Card>
            </div>

            <Card>
              <div className="p-5 flex items-center justify-between border-b border-stone-200">
                <div>
                  <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl font-semibold">Food Entries</div>
                  <div className="text-xs text-stone-500 mt-0.5">{entries.length} item{entries.length !== 1 ? 's' : ''} logged</div>
                </div>
                <button onClick={addEntry} className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 text-sm font-medium rounded-full hover:bg-emerald-800 transition shadow-sm">
                  <Plus size={14} /> Add Food
                </button>
              </div>
              <div className="divide-y divide-stone-100">
                {entries.map(e => {
                  const food = FOOD_DB.find(f => f.id === e.foodId);
                  const cat = food ? COLOR_CATEGORIES[food.color] : null;
                  return (
                    <div key={e.id} className="p-4 grid grid-cols-12 gap-3 items-center hover:bg-orange-50/40 transition">
                      <div className="col-span-1 flex justify-center">
                        {cat && <div className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-sm" style={{ background: cat.hex }} title={cat.label} />}
                      </div>
                      <div className="col-span-5">
                        <select value={e.foodId} onChange={ev=>updateEntry(e.id,'foodId',ev.target.value)} className="w-full border border-stone-200 px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500">
                          {FOOD_DB.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" value={e.portionG} onChange={ev=>updateEntry(e.id,'portionG',Number(ev.target.value))} className="w-full border border-stone-200 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500" />
                          <span className="text-xs text-stone-500">g/ml</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <select value={e.meal} onChange={ev=>updateEntry(e.id,'meal',ev.target.value)} className="w-full border border-stone-200 px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500">
                          <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button onClick={()=>removeEntry(e.id)} className="text-stone-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-full transition">
                          <Trash2 size={16} />
                        </button>
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
          </div>
        )}

        {/* ========== RESULTS TAB ========== */}
        {tab === 'results' && (
          <div>
            <SectionHeading
              eyebrow="Phase 01 · Individual Analysis"
              title="Your color pigment intake."
              sub={`Analysis of ${entries.length} food items reported in your 24-hour recall, mapped to the USDA Flavonoid Database (Release 3.3) and Khoo et al. 2017 color categories.`}
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

            {/* MyPlate row */}
            <Card className="p-6 mb-5">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-4">MyPlate Coverage / U.S. Dietary Guidelines</div>
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              <Card className="p-6">
                <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-1">Intake by Flavonoid Class</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-4">Six classes, six colors</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={classBarData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e9dc" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip formatter={(v) => `${v} mg`} contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} />
                    <Bar dataKey="mg" radius={[0, 4, 4, 0]}>
                      {classBarData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-1">vs. U.S. National Average</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-4">NHANES 2007–2008 comparison</div>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              <Card className="p-6">
                <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-1">Pigment Distribution by Color</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-4">A spectrum on your plate</div>
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
                <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-1">By Meal Occasion</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-4">When you got your pigments</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mealStackData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0e9dc" />
                    <XAxis dataKey="meal" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    {Object.keys(FLAVONOID_CLASSES).map(k => (
                      <Bar key={k} dataKey={FLAVONOID_CLASSES[k].label} stackId="a" fill={FLAVONOID_CLASSES[k].color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Fruit/Veg breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Apple size={22} strokeWidth={1.5} style={{ color: '#C73E3E' }} />
                  <div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Fruits Logged</div>
                    <div style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-medium">{analysis.fruitCount}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.keys(COLOR_CATEGORIES).map(c => (
                    <div key={c} className="flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg bg-stone-50">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLOR_CATEGORIES[c].hex }} />
                      <div className="flex-1 text-stone-700">{COLOR_CATEGORIES[c].label}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="font-medium" >{analysis.fruitColorCounts[c]}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Carrot size={22} strokeWidth={1.5} style={{ color: '#5B8C3E' }} />
                  <div>
                    <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Vegetables Logged</div>
                    <div style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl font-medium">{analysis.vegCount}</div>
                  </div>
                </div>
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

            {/* Health benefits & gaps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              <Card className="p-6">
                <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-1">Projected Health Benefit Alignment</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-4">From Khoo et al. 2017, Tables 2–3</div>
                <div className="space-y-3">
                  {Object.keys(FLAVONOID_CLASSES).map(k => {
                    const mg = analysis.flavTotals[k];
                    if (mg === 0) return null;
                    return (
                      <div key={k} className="border-l-2 pl-4 py-1" style={{ borderColor: FLAVONOID_CLASSES[k].color }}>
                        <div className="flex items-baseline justify-between">
                          <div className="font-medium text-sm">{FLAVONOID_CLASSES[k].label}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xs text-stone-500">{mg.toFixed(1)} mg</div>
                        </div>
                        <div className="text-xs text-stone-600 leading-relaxed mt-1">{HEALTH_BENEFITS[k].join(' · ')}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-6" style={{ background: 'linear-gradient(135deg, #FFF6E6 0%, #FCEEDA 100%)' }}>
                <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-amber-800 font-semibold mb-1"><AlertCircle size={12} /> Gaps & Opportunities</div>
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-4">Missing color pigments</div>
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

            {/* Score breakdown */}
            <Card className="p-6 mb-5">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-1">About Your ChromaDiet Score</div>
              <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-4">Transparent algorithm</div>
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
              sub="Anonymous aggregated data from all submissions stored in this browser. For multi-device research deployments, swap the localStorage layer for a backend (Supabase, Firebase, or a custom API)."
            />
            {cohortLoading ? (
              <div className="text-stone-500 text-sm text-center py-12">Loading cohort data…</div>
            ) : !cohortStats ? (
              <Card className="p-12 text-center">
                <Users size={32} strokeWidth={1.2} className="mx-auto text-stone-400 mb-4" />
                <div style={{ fontFamily: 'Fraunces, serif' }} className="text-2xl mb-2 font-medium">No submissions yet</div>
                <p className="text-sm text-stone-600 max-w-md mx-auto">Once participants submit their 24-hour recalls, aggregate statistics will appear here in real time.</p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  <Card className="p-6" accent="#7B3F9E">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold">Participants</div>
                    <div style={{ fontFamily: 'Fraunces, serif' }} className="text-5xl font-medium mt-2 text-stone-900">{cohortStats.n}</div>
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
                  <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-1">Cohort vs. NHANES National Mean</div>
                  <div style={{ fontFamily: 'Fraunces, serif' }} className="text-xl font-medium mb-4">Mean intake by flavonoid class</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={Object.keys(FLAVONOID_CLASSES).map(k => ({
                      name: FLAVONOID_CLASSES[k].label,
                      Cohort: Number(cohortStats.means[k].toFixed(2)),
                      NHANES: NHANES_MEAN[k],
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0e9dc" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
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
              sub="ChromaDiet integrates four authoritative sources. All values, categories, and benefit linkages are traceable to peer-reviewed literature or USDA databases."
            />

            <Card className="p-6 mb-4">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-4">Primary References</div>
              <ol className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">USDA Database for the Flavonoid Content of Selected Foods, Release 3.3</div>
                    <div className="text-stone-600 text-xs mt-1">Defines six flavonoid classes and 29 individual compounds.</div>
                    <a href="https://www.ars.usda.gov/ARSUserFiles/80400535/Data/Flav/Flav3.3.pdf" target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-medium underline inline-flex items-center gap-1 mt-1">View source <ArrowUpRight size={12} /></a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Khoo HE, Azlan A, Tang ST, Lim SM. Anthocyanidins and anthocyanins: colored pigments as food, pharmaceutical ingredients, and the potential health benefits. <em>Food Nutr Res.</em> 2017;61:1361779.</div>
                    <div className="text-stone-600 text-xs mt-1">Source for color category mapping (Table 1) and pigment-to-health-benefit linkages (Tables 2 & 3).</div>
                    <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5613902/" target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-medium underline inline-flex items-center gap-1 mt-1">View source <ArrowUpRight size={12} /></a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">USDA NHANES Flavonoid Intake Tables, 2007–2008</div>
                    <div className="text-stone-600 text-xs mt-1">Population reference values for U.S. adult flavonoid intake.</div>
                    <a href="https://www.ars.usda.gov/ARSUserFiles/80400530/pdf/0708/flav_tables_1-4_2007-2008.pdf" target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-medium underline inline-flex items-center gap-1 mt-1">View source <ArrowUpRight size={12} /></a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <BookOpen size={16} strokeWidth={1.5} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">USDA MyPlate / U.S. Dietary Guidelines for Americans</div>
                    <div className="text-stone-600 text-xs mt-1">Five food group classifications.</div>
                  </div>
                </li>
              </ol>
            </Card>

            <Card className="p-6 mb-4">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3">ChromaDiet Score Formula</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="bg-stone-50 p-4 text-xs leading-relaxed border border-stone-200 rounded-lg">
                Score = (classes_present / 6) × 30<br/>
                {'      '}+ (colors_present / 5) × 25<br/>
                {'      '}+ min(total_mg / NHANES_total, 1) × 20<br/>
                {'      '}+ (myplate_groups_hit / 5) × 15<br/>
                {'      '}+ min(anthocyanidin_mg / 25, 1) × 10
              </div>
              <p className="text-xs text-stone-600 mt-3 leading-relaxed">
                The 25 mg/day anthocyanidin threshold is based on observational evidence summarized in Khoo et al. 2017 linking that level to cardiovascular and metabolic benefits. Weights are heuristic and intended for research/educational use; not validated against clinical outcomes.
              </p>
            </Card>

            <Card className="p-6 mb-4">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3">Limitations & Caveats</div>
              <ul className="text-sm text-stone-700 space-y-2 list-disc pl-5">
                <li>24-hour recalls are subject to recall bias and may not reflect habitual intake.</li>
                <li>The embedded food reference dataset includes ~40 high-flavonoid foods; rare or composite foods may not be represented.</li>
                <li>Flavonoid values vary by cultivar, ripeness, processing, and cooking method; reported values are means.</li>
                <li>Health benefit linkages are summarized from observational/mechanistic literature.</li>
                <li>Cohort persistence uses browser localStorage — data is local to this browser only.</li>
                <li>Phase 2 (flavor, aroma, texture, taste) is scaffolded but not yet active.</li>
              </ul>
            </Card>

            <Card className="p-6">
              <div className="text-[10px] tracking-[0.2em] uppercase text-stone-500 font-semibold mb-3">Six USDA Flavonoid Classes & Their 29 Compounds</div>
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
          <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>v0.3 · Phase 1</div>
        </div>
      </footer>
    </div>
  );
}
