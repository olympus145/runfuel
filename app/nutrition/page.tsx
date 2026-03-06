"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Flame, TrendingDown, TrendingUp, Scale, Activity, Bike, RotateCcw } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Meal { id: string; date: string; mealType: string; name: string; calories: number; proteinG: number | null; carbsG: number | null; fatG: number | null; }
interface User { dailyCalorieGoal: number | null; dailyProteinGoal: number | null; weightGoal: number | null; currentWeight: number | null; }
interface WeightLog { id: string; date: string; weightLbs: number; bodyFatPct: number | null; }
interface DayStat { date: string; caloriesIn: number; caloriesBurned: number; net: number; protein: number; weight: number | null; }

// ── Constants ─────────────────────────────────────────────────────────────────
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "pre-run", "post-run"];
const MEAL_COLORS: Record<string, string> = {
  breakfast: "#c8a96e", lunch: "#4a7c59", dinner: "#3b82f6",
  snack: "#a855f7", "pre-run": "#f97316", "post-run": "#ef4444",
};
const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "2Y", days: 730 },
  { label: "All", days: 9999 },
] as const;
type RangeLabel = typeof RANGES[number]["label"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function dateFromDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function today() { return new Date().toISOString().slice(0, 10); }

function fmtDate(iso: string, range: RangeLabel) {
  const d = new Date(iso + "T12:00:00");
  if (range === "1M" || range === "3M") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (range === "6M" || range === "1Y") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/** Downsample array to at most `max` evenly spaced points */
function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  return Array.from({ length: max }, (_, i) => arr[Math.round(i * step)]);
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-[3px] bg-[#161616] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Range selector ────────────────────────────────────────────────────────────
function RangeSelector({ value, onChange }: { value: RangeLabel; onChange: (r: RangeLabel) => void }) {
  return (
    <div className="flex items-center gap-1 bg-[#0a0a0a] border border-[#161616] rounded-xl p-1">
      {RANGES.map(r => (
        <button key={r.label} onClick={() => onChange(r.label)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium tracking-wide transition-all ${
            value === r.label
              ? "bg-[#161616] text-white border border-[#252525]"
              : "text-[#383838] hover:text-[#666]"
          }`}>
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ── Custom tooltip base ───────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f0f] border border-[#252525] rounded-xl px-3 py-2.5 text-[12px]">
      <p className="text-[#555] mb-1.5 text-[10px] uppercase tracking-wide">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          <span className="text-[#888]">{p.name}:</span>
          <span className="font-medium">{Math.round(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Nutrition() {
  const [tab, setTab] = useState<"daily" | "trends" | "weight">("daily");
  const [range, setRange] = useState<RangeLabel>("1M");

  // Daily state
  const [meals, setMeals] = useState<Meal[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [date, setDate] = useState(today());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ mealType: "breakfast", name: "", calories: "", proteinG: "", carbsG: "", fatG: "" });
  const [todayBurned, setTodayBurned] = useState(0);

  // Trends + Weight state
  const [stats, setStats] = useState<DayStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [weightLoading, setWeightLoading] = useState(false);
  const [weightForm, setWeightForm] = useState({ date: today(), weightLbs: "", bodyFatPct: "" });
  const [savingWeight, setSavingWeight] = useState(false);
  const [showWeightAdd, setShowWeightAdd] = useState(false);

  // ── Fetch daily meals ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/user").then(r => r.json()).then(setUser);
  }, []);

  useEffect(() => {
    fetch(`/api/nutrition?date=${date}`).then(r => r.json()).then(d => setMeals(d || []));
  }, [date]);

  // Fetch today's calorie burn (runs + bikes)
  useEffect(() => {
    const t = today();
    Promise.all([
      fetch(`/api/runs?start=${t}&end=${t}`).then(r => r.json()),
      fetch(`/api/bikes?start=${t}&end=${t}`).then(r => r.json()),
    ]).then(([runs, bikes]) => {
      const runCals = (runs || []).reduce((s: number, r: { calories: number | null; distanceMiles: number }) =>
        s + (r.calories ?? Math.round(r.distanceMiles * 100)), 0);
      const bikeCals = (bikes || []).reduce((s: number, b: { calories: number | null; distanceMiles: number }) =>
        s + (b.calories ?? Math.round(b.distanceMiles * 40)), 0);
      setTodayBurned(runCals + bikeCals);
    });
  }, []);

  // ── Fetch trend stats ──────────────────────────────────────────────────────
  const fetchStats = useCallback(async (r: RangeLabel) => {
    setStatsLoading(true);
    const rangeDef = RANGES.find(x => x.label === r)!;
    const start = rangeDef.days >= 9999
      ? "2020-01-01"
      : dateFromDaysAgo(rangeDef.days);
    const end = today();
    const data = await fetch(`/api/stats?start=${start}&end=${end}`).then(x => x.json());
    setStats(data || []);
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "trends") fetchStats(range);
  }, [tab, range, fetchStats]);

  // ── Fetch weight logs ──────────────────────────────────────────────────────
  const fetchWeight = useCallback(async (r: RangeLabel) => {
    setWeightLoading(true);
    const rangeDef = RANGES.find(x => x.label === r)!;
    const start = rangeDef.days >= 9999 ? "2020-01-01" : dateFromDaysAgo(rangeDef.days);
    const data = await fetch(`/api/weight?start=${start}&end=${today()}`).then(x => x.json());
    setWeightLogs(data || []);
    setWeightLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "weight") fetchWeight(range);
  }, [tab, range, fetchWeight]);

  // ── Daily actions ──────────────────────────────────────────────────────────
  async function addMeal() {
    if (!form.name || !form.calories) { alert("Name and calories required"); return; }
    const res = await fetch("/api/nutrition", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date, mealType: form.mealType, name: form.name, calories: parseInt(form.calories),
        proteinG: form.proteinG ? parseFloat(form.proteinG) : null,
        carbsG: form.carbsG ? parseFloat(form.carbsG) : null,
        fatG: form.fatG ? parseFloat(form.fatG) : null,
      }),
    });
    const meal = await res.json();
    setMeals([...meals, meal].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setShowAdd(false);
    setForm({ mealType: "breakfast", name: "", calories: "", proteinG: "", carbsG: "", fatG: "" });
  }

  async function deleteMeal(id: string) {
    await fetch(`/api/nutrition?id=${id}`, { method: "DELETE" });
    setMeals(meals.filter(m => m.id !== id));
  }

  // ── Weight actions ─────────────────────────────────────────────────────────
  async function addWeight() {
    if (!weightForm.weightLbs) { alert("Weight required"); return; }
    setSavingWeight(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: weightForm.date,
          weightLbs: parseFloat(weightForm.weightLbs),
          bodyFatPct: weightForm.bodyFatPct ? parseFloat(weightForm.bodyFatPct) : null,
        }),
      });
      const log = await res.json();
      setWeightLogs(prev => [...prev, log].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setUser(u => u ? { ...u, currentWeight: parseFloat(weightForm.weightLbs) } : u);
      setWeightForm({ date: today(), weightLbs: "", bodyFatPct: "" });
      setShowWeightAdd(false);
    } finally { setSavingWeight(false); }
  }

  async function deleteWeight(id: string) {
    await fetch(`/api/weight?id=${id}`, { method: "DELETE" });
    setWeightLogs(weightLogs.filter(w => w.id !== id));
  }

  // ── Derived daily values ───────────────────────────────────────────────────
  const totalCal = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + (m.proteinG ?? 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbsG ?? 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fatG ?? 0), 0);
  const netCalories = totalCal - todayBurned;
  const calGoal = user?.dailyCalorieGoal ?? 0;
  const protGoal = user?.dailyProteinGoal ?? 0;
  const mealsByType = MEAL_TYPES.reduce((acc, type) => {
    acc[type] = meals.filter(m => m.mealType === type);
    return acc;
  }, {} as Record<string, Meal[]>);

  // ── Derived trend values ───────────────────────────────────────────────────
  const nonZeroStats = stats.filter(d => d.caloriesIn > 0 || d.caloriesBurned > 0);
  const avgIn = nonZeroStats.length ? Math.round(nonZeroStats.reduce((s, d) => s + d.caloriesIn, 0) / nonZeroStats.length) : 0;
  const avgBurned = nonZeroStats.length ? Math.round(nonZeroStats.reduce((s, d) => s + d.caloriesBurned, 0) / nonZeroStats.length) : 0;
  const avgNet = nonZeroStats.length ? Math.round(nonZeroStats.reduce((s, d) => s + d.net, 0) / nonZeroStats.length) : 0;
  const totalDeficit = nonZeroStats.reduce((s, d) => s + (d.net < 0 ? Math.abs(d.net) : 0), 0);
  const totalSurplus = nonZeroStats.reduce((s, d) => s + (d.net > 0 ? d.net : 0), 0);
  const chartData = downsample(stats, 90); // max 90 points for performance

  // ── Derived weight values ──────────────────────────────────────────────────
  const weightData = weightLogs.filter(w => w.weightLbs > 0);
  const latestWeight = weightData.length ? weightData[weightData.length - 1].weightLbs : null;
  const minWeight = weightData.length ? Math.min(...weightData.map(w => w.weightLbs)) : null;
  const maxWeight = weightData.length ? Math.max(...weightData.map(w => w.weightLbs)) : null;
  const weightChange = weightData.length >= 2
    ? weightData[weightData.length - 1].weightLbs - weightData[0].weightLbs
    : null;
  const weightGoalLbs = user?.weightGoal ?? null;

  return (
    <div className="px-4 pt-6 pb-4 md:px-8 md:pt-10 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-[#c8a96e] uppercase mb-1">Body & Fuel</p>
          <h2 className="text-2xl font-bold text-white">Nutrition</h2>
        </div>
        {tab === "daily" && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-sm !w-auto !px-3 !py-1.5 !rounded-xl" />
            <button onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f0f0f] text-[#555] hover:text-[#888] hover:bg-[#151515] border border-[#1a1a1a] text-sm transition-colors whitespace-nowrap">
              <Plus size={14} /> <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        )}
        {tab === "weight" && (
          <button onClick={() => setShowWeightAdd(!showWeightAdd)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f0f0f] text-[#555] hover:text-[#888] hover:bg-[#151515] border border-[#1a1a1a] text-sm transition-colors flex-shrink-0">
            <Plus size={14} /> <span className="hidden sm:inline">Log Weight</span>
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-[#0a0a0a] border border-[#161616] rounded-xl p-1 mb-6 w-fit">
        {(["daily", "trends", "weight"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium tracking-wide capitalize transition-all ${
              tab === t ? "bg-[#161616] text-white border border-[#252525]" : "text-[#383838] hover:text-[#666]"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════ DAILY TAB ══════════════════════════════ */}
      {tab === "daily" && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {/* Calories In */}
            <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-4 md:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] tracking-[0.2em] text-[#333] uppercase">Calories In</span>
                <Flame size={13} color="#c8a96e" />
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[26px] font-bold text-white leading-none">{totalCal}</span>
                {calGoal > 0 && <span className="text-xs text-[#333]">/ {calGoal}</span>}
              </div>
              {calGoal > 0 && (
                <ProgressBar value={totalCal} max={calGoal}
                  color={totalCal > calGoal ? "#ef4444" : "#c8a96e"} />
              )}
            </div>

            {/* Calories Burned */}
            <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] tracking-[0.2em] text-[#333] uppercase">Burned</span>
                <Activity size={13} color="#4a7c59" />
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[26px] font-bold text-white leading-none">{todayBurned}</span>
                <span className="text-xs text-[#333]">kcal</span>
              </div>
              <p className="text-[10px] text-[#2a2a2a]">from activities today</p>
            </div>

            {/* Net Calories */}
            <div className={`rounded-2xl border p-4 ${
              netCalories < 0
                ? "border-[#4a7c59]/20 bg-[#4a7c59]/5"
                : netCalories === 0
                ? "border-[#161616] bg-[#0c0c0c]"
                : "border-[#ef4444]/15 bg-[#ef4444]/5"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] tracking-[0.2em] text-[#333] uppercase">Net Calories</span>
                {netCalories < 0
                  ? <TrendingDown size={13} color="#4a7c59" />
                  : <TrendingUp size={13} color={netCalories > 0 ? "#ef4444" : "#555"} />
                }
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className={`text-[26px] font-bold leading-none ${
                  netCalories < 0 ? "text-[#7ab88a]" : netCalories > 0 ? "text-[#f87171]" : "text-white"
                }`}>
                  {netCalories > 0 ? `+${netCalories}` : netCalories}
                </span>
                <span className="text-xs text-[#333]">kcal</span>
              </div>
              <p className="text-[10px] text-[#2a2a2a]">
                {netCalories < 0 ? `${Math.abs(netCalories)} kcal deficit` : netCalories > 0 ? "caloric surplus" : "balanced"}
              </p>
            </div>

            {/* Protein */}
            <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] tracking-[0.2em] text-[#333] uppercase">Protein</span>
                <Bike size={13} color="#a855f7" />
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[26px] font-bold text-white leading-none">{Math.round(totalProtein)}</span>
                {protGoal > 0 && <span className="text-xs text-[#333]">/ {protGoal}g</span>}
                {!protGoal && <span className="text-xs text-[#333]">g</span>}
              </div>
              {protGoal > 0 && <ProgressBar value={totalProtein} max={protGoal} color="#a855f7" />}
            </div>
          </div>

          {/* Macros breakdown */}
          <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-5 mb-5">
            <p className="text-[9px] tracking-[0.25em] text-[#2e2e2e] uppercase mb-4">Macros Today</p>
            <div className="grid grid-cols-3 gap-5">
              {[
                { label: "Protein", value: totalProtein, goal: protGoal, unit: "g", color: "#a855f7" },
                { label: "Carbs", value: totalCarbs, goal: 0, unit: "g", color: "#3b82f6" },
                { label: "Fat", value: totalFat, goal: 0, unit: "g", color: "#c8a96e" },
              ].map(({ label, value, goal, unit, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] tracking-[0.1em] text-[#333] uppercase">{label}</span>
                    <span className="text-sm font-semibold text-white">
                      {value.toFixed(0)}{unit}
                      {goal > 0 && <span className="text-[#2e2e2e] font-normal"> / {goal}</span>}
                    </span>
                  </div>
                  {goal > 0 && <ProgressBar value={value} max={goal} color={color} />}
                </div>
              ))}
            </div>
          </div>

          {/* Add meal form */}
          {showAdd && (
            <div className="rounded-2xl border border-[#252525] bg-[#0c0c0c] p-5 mb-5">
              <p className="text-[9px] tracking-[0.2em] text-[#2e2e2e] uppercase mb-4">Add Food</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div><label className="Field-label">Meal type</label>
                  <select value={form.mealType} onChange={e => setForm({ ...form, mealType: e.target.value })}>
                    {MEAL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div><label className="Field-label">Food / Item *</label>
                  <input placeholder="Greek yogurt with berries" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div><label className="Field-label">Calories *</label><input type="number" placeholder="320" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} /></div>
                <div><label className="Field-label">Protein (g)</label><input type="number" step="0.1" placeholder="28" value={form.proteinG} onChange={e => setForm({ ...form, proteinG: e.target.value })} /></div>
                <div><label className="Field-label">Carbs (g)</label><input type="number" step="0.1" placeholder="32" value={form.carbsG} onChange={e => setForm({ ...form, carbsG: e.target.value })} /></div>
                <div><label className="Field-label">Fat (g)</label><input type="number" step="0.1" placeholder="5" value={form.fatG} onChange={e => setForm({ ...form, fatG: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addMeal} className="px-4 py-2 rounded-xl bg-[#c8a96e]/15 text-[#c8a96e] hover:bg-[#c8a96e]/25 border border-[#c8a96e]/20 text-sm transition-all active:scale-95">Save</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-[#333] hover:text-[#555] text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Meal list */}
          <div className="space-y-3">
            {MEAL_TYPES.map(type => {
              const typeMeals = mealsByType[type];
              if (!typeMeals.length) return null;
              const typeCal = typeMeals.reduce((s, m) => s + m.calories, 0);
              return (
                <div key={type} className="rounded-2xl border border-[#161616] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between border-b border-[#0f0f0f]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MEAL_COLORS[type] }} />
                      <span className="text-[10px] font-medium text-[#555] uppercase tracking-wider">{type}</span>
                    </div>
                    <span className="text-[11px] text-[#2e2e2e]">{typeCal} kcal</span>
                  </div>
                  {typeMeals.map(meal => (
                    <div key={meal.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#0f0f0f] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#bbb] truncate">{meal.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#333]">
                          <span>{meal.calories} kcal</span>
                          {meal.proteinG && <span>{meal.proteinG.toFixed(0)}g protein</span>}
                          {meal.carbsG && <span>{meal.carbsG.toFixed(0)}g carbs</span>}
                          {meal.fatG && <span>{meal.fatG.toFixed(0)}g fat</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteMeal(meal.id)} className="text-[#222] hover:text-[#ef4444] transition-all ml-3 flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
            {meals.length === 0 && (
              <p className="text-[#222] text-[13px] py-10 text-center">No meals logged for this day.</p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════ TRENDS TAB ════════════════════════════ */}
      {tab === "trends" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] tracking-[0.25em] text-[#2e2e2e] uppercase">Calorie Balance</p>
            <RangeSelector value={range} onChange={r => setRange(r)} />
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center py-20">
              <RotateCcw size={16} className="text-[#333] animate-spin" />
            </div>
          ) : (
            <>
              {/* Summary stat row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Avg In", value: avgIn, unit: "kcal/day", color: "#c8a96e" },
                  { label: "Avg Burned", value: avgBurned, unit: "kcal/day", color: "#4a7c59" },
                  { label: "Avg Net", value: avgNet, unit: "kcal/day", color: avgNet < 0 ? "#7ab88a" : "#f87171" },
                  { label: avgNet < 0 ? "Total Deficit" : "Total Surplus", value: avgNet < 0 ? totalDeficit : totalSurplus, unit: "kcal", color: avgNet < 0 ? "#7ab88a" : "#f87171" },
                ].map(({ label, value, unit, color }) => (
                  <div key={label} className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-4">
                    <p className="text-[9px] tracking-[0.2em] text-[#333] uppercase mb-2">{label}</p>
                    <p className="text-[22px] font-bold leading-none" style={{ color }}>
                      {value > 0 && label.includes("Net") ? `+${value}` : value}
                    </p>
                    <p className="text-[10px] text-[#2a2a2a] mt-0.5">{unit}</p>
                  </div>
                ))}
              </div>

              {/* Calorie balance area chart */}
              <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-5 mb-4">
                <p className="text-[9px] tracking-[0.2em] text-[#2e2e2e] uppercase mb-5">Calories In vs. Burned</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c8a96e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c8a96e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradBurned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4a7c59" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4a7c59" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#333" }}
                      tickFormatter={v => fmtDate(v, range)} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#333" }} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="caloriesIn" name="Calories In"
                      stroke="#c8a96e" strokeWidth={1.5} fill="url(#gradIn)" dot={false} />
                    <Area type="monotone" dataKey="caloriesBurned" name="Burned"
                      stroke="#4a7c59" strokeWidth={1.5} fill="url(#gradBurned)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Net calories bar chart (deficit/surplus) */}
              <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-5">
                <p className="text-[9px] tracking-[0.2em] text-[#2e2e2e] uppercase mb-1">Net Calories (Deficit / Surplus)</p>
                <p className="text-[10px] text-[#2a2a2a] mb-5">Green bars = deficit (burned more than consumed)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#333" }}
                      tickFormatter={v => fmtDate(v, range)} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#333" }} />
                    <Tooltip content={<ChartTip />} />
                    <ReferenceLine y={0} stroke="#333" strokeWidth={1} />
                    <Bar dataKey="net" name="Net"
                      fill="#4a7c59"
                      // Green when negative (deficit), red when positive (surplus)
                      // recharts doesn't support per-bar color easily, so we use a cell approach via a custom cell
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-[#2a2a2a]">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-[#4a7c59] inline-block" /> Deficit (negative = good)</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-[#ef4444] inline-block" /> Surplus (positive)</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════ WEIGHT TAB ════════════════════════════ */}
      {tab === "weight" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] tracking-[0.25em] text-[#2e2e2e] uppercase">Weight History</p>
            <RangeSelector value={range} onChange={r => setRange(r)} />
          </div>

          {/* Add weight form */}
          {showWeightAdd && (
            <div className="rounded-2xl border border-[#252525] bg-[#0c0c0c] p-5 mb-5">
              <p className="text-[9px] tracking-[0.2em] text-[#2e2e2e] uppercase mb-4">Log Weight</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div><label className="Field-label">Date</label>
                  <input type="date" value={weightForm.date} onChange={e => setWeightForm({ ...weightForm, date: e.target.value })} />
                </div>
                <div><label className="Field-label">Weight (lbs) *</label>
                  <input type="number" step="0.1" placeholder="165.0" value={weightForm.weightLbs} onChange={e => setWeightForm({ ...weightForm, weightLbs: e.target.value })} />
                </div>
                <div><label className="Field-label">Body Fat %</label>
                  <input type="number" step="0.1" placeholder="18.5" value={weightForm.bodyFatPct} onChange={e => setWeightForm({ ...weightForm, bodyFatPct: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addWeight} disabled={savingWeight}
                  className="px-4 py-2 rounded-xl bg-[#a855f7]/15 text-[#c084fc] hover:bg-[#a855f7]/25 border border-[#a855f7]/20 text-sm transition-all active:scale-95 disabled:opacity-40">
                  {savingWeight ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setShowWeightAdd(false)} className="px-4 py-2 rounded-xl text-[#333] hover:text-[#555] text-sm">Cancel</button>
              </div>
            </div>
          )}

          {weightLoading ? (
            <div className="flex items-center justify-center py-20">
              <RotateCcw size={16} className="text-[#333] animate-spin" />
            </div>
          ) : (
            <>
              {/* Weight summary stats */}
              {weightData.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Current", value: latestWeight ? `${latestWeight.toFixed(1)}` : "—", unit: "lbs", color: "#a855f7" },
                    { label: "Change", value: weightChange !== null ? (weightChange > 0 ? `+${weightChange.toFixed(1)}` : weightChange.toFixed(1)) : "—", unit: "lbs", color: weightChange !== null ? (weightChange < 0 ? "#7ab88a" : "#f87171") : "#555" },
                    { label: "Low", value: minWeight ? `${minWeight.toFixed(1)}` : "—", unit: "lbs", color: "#7ab88a" },
                    { label: "Goal", value: weightGoalLbs ? `${weightGoalLbs.toFixed(1)}` : "—", unit: "lbs", color: "#c8a96e" },
                  ].map(({ label, value, unit, color }) => (
                    <div key={label} className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-4">
                      <p className="text-[9px] tracking-[0.2em] text-[#333] uppercase mb-2">{label}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[22px] font-bold leading-none" style={{ color }}>{value}</span>
                        <span className="text-[10px] text-[#2a2a2a]">{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Weight line chart */}
              {weightData.length >= 2 ? (
                <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-5 mb-4">
                  <p className="text-[9px] tracking-[0.2em] text-[#2e2e2e] uppercase mb-5">Weight Over Time</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={downsample(weightData, 90)}
                      margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#333" }}
                        tickFormatter={v => fmtDate(v.slice(0, 10), range)} interval="preserveStartEnd" />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#333" }}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-[#0f0f0f] border border-[#252525] rounded-xl px-3 py-2.5">
                              <p className="text-[10px] text-[#555] mb-1">{label ? fmtDate(String(label).slice(0, 10), range) : ""}</p>
                              <p className="text-[13px] font-bold text-[#c084fc]">{Number(payload[0].value).toFixed(1)} lbs</p>
                            </div>
                          );
                        }}
                      />
                      {weightGoalLbs && (
                        <ReferenceLine y={weightGoalLbs} stroke="#c8a96e" strokeDasharray="4 4" strokeWidth={1}
                          label={{ value: `Goal: ${weightGoalLbs}`, fill: "#c8a96e", fontSize: 10, position: "insideTopRight" }} />
                      )}
                      <Line type="monotone" dataKey="weightLbs" name="Weight"
                        stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#c084fc" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-10 text-center mb-4">
                  <Scale size={24} className="text-[#222] mx-auto mb-3" />
                  <p className="text-[13px] text-[#2e2e2e]">Log at least 2 weigh-ins to see your trend.</p>
                </div>
              )}

              {/* Weight log table */}
              {weightData.length > 0 && (
                <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#0f0f0f]">
                    <p className="text-[9px] tracking-[0.2em] text-[#2e2e2e] uppercase">Log</p>
                  </div>
                  <div className="divide-y divide-[#0f0f0f] max-h-72 overflow-y-auto">
                    {[...weightData].reverse().map(w => (
                      <div key={w.id} className="px-5 py-3 flex items-center justify-between hover:bg-[#0f0f0f] transition-colors">
                        <div>
                          <p className="text-[13px] font-medium text-[#bbb]">{w.weightLbs.toFixed(1)} lbs</p>
                          <p className="text-[11px] text-[#2e2e2e] mt-0.5">
                            {new Date(w.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                            {w.bodyFatPct && ` · ${w.bodyFatPct}% BF`}
                          </p>
                        </div>
                        <button onClick={() => deleteWeight(w.id)} className="text-[#222] hover:text-[#ef4444] transition-all ml-3">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
