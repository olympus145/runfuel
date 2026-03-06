"use client";

import { useEffect, useState } from "react";
import { Activity, Bike, Dumbbell, Flame, TrendingUp, Zap, ChevronRight, Heart, RotateCcw } from "lucide-react";
import Link from "next/link";
import { formatPaceMile, formatDuration } from "@/lib/utils";

interface Run {
  id: string; date: string; distanceMiles: number; durationSeconds: number;
  avgPaceSecMile: number | null; avgHeartRate: number | null; name: string | null;
}
interface BikeRide {
  id: string; date: string; distanceMiles: number; durationSeconds: number;
  avgSpeedMph: number | null; avgHeartRate: number | null; name: string | null;
}
interface StrengthLog { id: string; date: string; type: string; durationMin: number | null; }
interface CoachingLog {
  feedback: string; highlights: string | null;
  runScore: number | null; nutritionScore: number | null;
  recoveryScore: number | null; overallScore: number | null; focusArea: string | null;
}
interface User {
  name: string | null;
  weeklyRunMilesGoal: number | null; weeklyBikeMilesGoal: number | null;
  strengthDaysGoal: number | null; coreDaysGoal: number | null;
  dailyCalorieGoal: number | null; dailyProteinGoal: number | null;
  currentWeight: number | null;
}

// ── Score Arc ──
function ScoreArc({ score, label, color = "#4a7c59", size = "md" }: {
  score: number; label: string; color?: string; size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? { w: 96, r: 40, stroke: 6, font: "text-2xl" }
    : size === "sm" ? { w: 60, r: 24, stroke: 4, font: "text-sm" }
    : { w: 76, r: 32, stroke: 5, font: "text-xl" };
  const c = 2 * Math.PI * dims.r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: dims.w, height: dims.w }}>
        <svg width={dims.w} height={dims.w} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={dims.w / 2} cy={dims.w / 2} r={dims.r} fill="none" stroke="#161616" strokeWidth={dims.stroke} />
          <circle cx={dims.w / 2} cy={dims.w / 2} r={dims.r} fill="none" stroke={color} strokeWidth={dims.stroke}
            strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${dims.font} font-bold text-white`}>{score}</span>
        </div>
      </div>
      <span className="text-[9px] tracking-[0.15em] text-[#3a3a3a] uppercase">{label}</span>
    </div>
  );
}

// ── Progress bar ──
function Bar({ value, max, color = "#4a7c59" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-[3px] bg-[#161616] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Stat card ──
function StatCard({ label, value, unit, sub, color, icon: Icon, progress, href }: {
  label: string; value: string | number; unit?: string; sub?: string; color: string;
  icon: React.ElementType; progress?: { value: number; max: number }; href?: string;
}) {
  const content = (
    <div className={`rounded-2xl border border-[#161616] bg-[#0c0c0c] p-4 transition-all duration-150 ${href ? "hover:border-[#252525] active:scale-[0.98]" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] tracking-[0.2em] text-[#333] uppercase">{label}</span>
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}14` }}>
          <Icon size={13} color={color} strokeWidth={1.5} />
        </div>
      </div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-[28px] font-bold text-white leading-none tracking-tight">{value}</span>
        {unit && <span className="text-xs text-[#333] font-normal">{unit}</span>}
      </div>
      {sub && <p className="text-[11px] text-[#2e2e2e] mb-2">{sub}</p>}
      {progress && <Bar value={progress.value} max={progress.max} color={color} />}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── Activity row ──
function ActivityRow({ icon: Icon, color, label, date, meta }: {
  icon: React.ElementType; color: string; label: string; date: string; meta: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#0f0f0f] last:border-0">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}16` }}>
        <Icon size={14} color={color} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#bbb] font-medium truncate">{label}</p>
        <p className="text-[11px] text-[#2e2e2e] mt-0.5">{meta}</p>
      </div>
      <p className="text-[11px] text-[#2a2a2a] flex-shrink-0">{date}</p>
    </div>
  );
}

// ── Generate coaching button ──
function GenerateCoachingBtn({ date, onGenerated }: { date: string; onGenerated: (c: CoachingLog) => void }) {
  const [loading, setLoading] = useState(false);
  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/coaching", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!data.error) onGenerated(data);
    } finally { setLoading(false); }
  }
  return (
    <button onClick={generate} disabled={loading}
      className="w-full py-3 rounded-xl bg-[#4a7c59]/10 border border-[#4a7c59]/20 text-[#7ab88a] text-[13px] font-medium hover:bg-[#4a7c59]/15 active:scale-[0.98] transition-all disabled:opacity-40">
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <RotateCcw size={13} className="animate-spin" /> Generating…
        </span>
      ) : "Generate Today's Coaching"}
    </button>
  );
}

// ── Main dashboard ──
export default function Dashboard() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [bikes, setBikes] = useState<BikeRide[]>([]);
  const [strength, setStrength] = useState<StrengthLog[]>([]);
  const [coaching, setCoaching] = useState<CoachingLog | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [nutrition, setNutrition] = useState({ calories: 0, protein: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([
      fetch("/api/runs?limit=20").then(r => r.json()),
      fetch("/api/bikes?limit=20").then(r => r.json()),
      fetch("/api/strength?weeks=1").then(r => r.json()),
      fetch(`/api/coaching?date=${today}`).then(r => r.json()),
      fetch("/api/user").then(r => r.json()),
      fetch(`/api/nutrition?date=${today}`).then(r => r.json()),
    ]).then(([r, b, s, c, u, n]) => {
      setRuns(r || []);
      setBikes(b || []);
      setStrength(s || []);
      setCoaching(c?.feedback ? c : null);
      setUser(u);
      const cal = (n || []).reduce((a: number, m: { calories: number }) => a + m.calories, 0);
      const prot = (n || []).reduce((a: number, m: { proteinG: number | null }) => a + (m.proteinG ?? 0), 0);
      setNutrition({ calories: cal, protein: Math.round(prot) });
      setLoading(false);
    });
  }, [today]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/coros/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      const [r, b] = await Promise.all([
        fetch("/api/runs?limit=20").then(x => x.json()),
        fetch("/api/bikes?limit=20").then(x => x.json()),
      ]);
      setRuns(r || []); setBikes(b || []);
    } finally { setSyncing(false); }
  }

  // Week stats
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekRuns = runs.filter(r => new Date(r.date) >= weekAgo);
  const weekBikes = bikes.filter(b => new Date(b.date) >= weekAgo);
  const weekRunMiles = weekRuns.reduce((s, r) => s + r.distanceMiles, 0);
  const weekBikeMiles = weekBikes.reduce((s, b) => s + b.distanceMiles, 0);
  const strengthDays = strength.filter(l => ["strength", "hiit", "crossfit"].includes(l.type)).length;
  const coreDays = strength.filter(l => ["core", "yoga"].includes(l.type)).length;

  // Recent activity (merged + sorted)
  const recentActivity = [
    ...runs.slice(0, 5).map(r => ({ type: "run" as const, date: r.date, label: r.name ?? "Run", data: r })),
    ...bikes.slice(0, 5).map(b => ({ type: "bike" as const, date: b.date, label: b.name ?? "Ride", data: b })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-[#222] text-[11px] tracking-[0.3em] uppercase animate-pulse">Loading</p>
    </div>
  );

  const highlights: string[] = (() => {
    try { return coaching?.highlights ? JSON.parse(coaching.highlights) : []; } catch { return []; }
  })();

  return (
    <div className="px-4 pt-6 pb-4 md:px-8 md:pt-10 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-[#3a3a3a] uppercase mb-1.5">{dateStr}</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
            {greeting}
          </h1>
          {coaching?.focusArea && (
            <p className="text-[12px] text-[#3a3a3a] mt-1.5">
              Focus: <span className="text-[#7ab88a] capitalize">{coaching.focusArea}</span>
            </p>
          )}
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#4a7c59]/10 text-[#7ab88a] hover:bg-[#4a7c59]/15 active:scale-95 transition-all text-[12px] font-medium disabled:opacity-40 border border-[#4a7c59]/15 flex-shrink-0">
          <Zap size={13} />
          <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync"}</span>
        </button>
      </div>

      {/* ── Coaching scores ── */}
      {coaching ? (
        <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[9px] tracking-[0.25em] text-[#2e2e2e] uppercase">Coach Scores</p>
            <Link href="/coaching" className="text-[11px] text-[#4a7c59] hover:text-[#7ab88a] flex items-center gap-0.5 transition-colors">
              Full report <ChevronRight size={11} />
            </Link>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <ScoreArc score={coaching.overallScore ?? 0} label="Overall" color="#c8a96e" size="lg" />
            <div className="w-px h-16 bg-[#161616]" />
            <div className="flex items-center gap-4 md:gap-6 flex-1">
              <ScoreArc score={coaching.runScore ?? 0} label="Run" color="#4a7c59" />
              <ScoreArc score={coaching.nutritionScore ?? 0} label="Nutrition" color="#3b82f6" />
              <ScoreArc score={coaching.recoveryScore ?? 0} label="Recovery" color="#a855f7" />
            </div>
          </div>
          {highlights.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#0f0f0f] space-y-1.5">
              {highlights.slice(0, 2).map((h, i) => (
                <p key={i} className="text-[12px] text-[#444] flex items-start gap-2">
                  <span className="text-[#4a7c59] mt-0.5 flex-shrink-0">—</span>
                  <span>{h}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-5 mb-6">
          <p className="text-[9px] tracking-[0.25em] text-[#2e2e2e] uppercase mb-3">Coach Scores</p>
          <p className="text-[13px] text-[#333] mb-4">Get personalized coaching based on your week&apos;s training and nutrition.</p>
          <GenerateCoachingBtn date={today} onGenerated={setCoaching} />
        </div>
      )}

      {/* ── Stat grid (6 cards: 2-col mobile, 3-col tablet+) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Run Miles" value={weekRunMiles.toFixed(1)} unit="mi"
          sub={user?.weeklyRunMilesGoal ? `of ${user.weeklyRunMilesGoal} mi goal` : "this week"}
          color="#4a7c59" icon={Activity} href="/runs"
          progress={user?.weeklyRunMilesGoal ? { value: weekRunMiles, max: user.weeklyRunMilesGoal } : undefined}
        />
        <StatCard
          label="Bike Miles" value={weekBikeMiles.toFixed(1)} unit="mi"
          sub={user?.weeklyBikeMilesGoal ? `of ${user.weeklyBikeMilesGoal} mi goal` : "this week"}
          color="#3b82f6" icon={Bike} href="/bikes"
          progress={user?.weeklyBikeMilesGoal ? { value: weekBikeMiles, max: user.weeklyBikeMilesGoal } : undefined}
        />
        <StatCard
          label="Strength" value={strengthDays} unit="days"
          sub={user?.strengthDaysGoal ? `of ${user.strengthDaysGoal} day goal` : "this week"}
          color="#a855f7" icon={Dumbbell} href="/strength"
          progress={user?.strengthDaysGoal ? { value: strengthDays, max: user.strengthDaysGoal } : undefined}
        />
        <StatCard
          label="Core" value={coreDays} unit="days"
          sub={user?.coreDaysGoal ? `of ${user.coreDaysGoal} day goal` : "this week"}
          color="#f97316" icon={TrendingUp} href="/strength"
          progress={user?.coreDaysGoal ? { value: coreDays, max: user.coreDaysGoal } : undefined}
        />
        <StatCard
          label="Calories" value={nutrition.calories} unit="kcal"
          sub={user?.dailyCalorieGoal ? `of ${user.dailyCalorieGoal} goal` : "today"}
          color="#f59e0b" icon={Flame} href="/nutrition"
          progress={user?.dailyCalorieGoal ? { value: nutrition.calories, max: user.dailyCalorieGoal } : undefined}
        />
        <StatCard
          label="Protein" value={`${nutrition.protein}`} unit="g"
          sub={user?.dailyProteinGoal ? `of ${user.dailyProteinGoal}g goal` : "today"}
          color="#ec4899" icon={Heart} href="/nutrition"
          progress={user?.dailyProteinGoal ? { value: nutrition.protein, max: user.dailyProteinGoal } : undefined}
        />
      </div>

      {/* ── Bottom panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent activity */}
        <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] tracking-[0.25em] text-[#2e2e2e] uppercase">Recent Activity</p>
            <Link href="/runs" className="text-[11px] text-[#4a7c59] hover:text-[#7ab88a] flex items-center gap-0.5 transition-colors">
              All runs <ChevronRight size={11} />
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-[13px] text-[#222] py-4 text-center">Sync your Coros to get started.</p>
          ) : (
            <div>
              {recentActivity.map((a, i) => {
                if (a.type === "run") {
                  const r = a.data as Run;
                  const meta = [
                    `${r.distanceMiles.toFixed(1)} mi`,
                    r.avgPaceSecMile ? `${formatPaceMile(r.avgPaceSecMile)}/mi` : null,
                    r.avgHeartRate ? `${r.avgHeartRate} bpm` : null,
                  ].filter(Boolean).join("  ·  ");
                  return (
                    <ActivityRow key={i} icon={Activity} color="#4a7c59" label={a.label}
                      date={new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      meta={meta} />
                  );
                } else {
                  const b = a.data as BikeRide;
                  const meta = [
                    `${b.distanceMiles.toFixed(1)} mi`,
                    b.avgSpeedMph ? `${b.avgSpeedMph.toFixed(1)} mph` : null,
                    formatDuration(b.durationSeconds),
                  ].filter(Boolean).join("  ·  ");
                  return (
                    <ActivityRow key={i} icon={Bike} color="#3b82f6" label={a.label}
                      date={new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      meta={meta} />
                  );
                }
              })}
            </div>
          )}

          {/* Mini run bar chart */}
          {weekRuns.length > 1 && (
            <div className="mt-4 pt-4 border-t border-[#0f0f0f]">
              <p className="text-[9px] tracking-[0.2em] text-[#222] uppercase mb-3">7-day mileage</p>
              <div className="flex items-end gap-1 h-8">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(Date.now() - (6 - i) * 86400000);
                  const iso = d.toISOString().slice(0, 10);
                  const dayRuns = runs.filter(r => r.date.slice(0, 10) === iso);
                  const mi = dayRuns.reduce((s, r) => s + r.distanceMiles, 0);
                  const maxMi = Math.max(...Array.from({ length: 7 }, (_, j) => {
                    const dd = new Date(Date.now() - (6 - j) * 86400000).toISOString().slice(0, 10);
                    return runs.filter(r => r.date.slice(0, 10) === dd).reduce((s, r) => s + r.distanceMiles, 0);
                  }));
                  const h = maxMi > 0 ? Math.max(4, (mi / maxMi) * 32) : 4;
                  return (
                    <div key={i} className="flex-1 rounded-sm transition-colors"
                      style={{ height: h, backgroundColor: mi > 0 ? "#4a7c59" : "#111" }}
                      title={mi > 0 ? `${mi.toFixed(1)} mi` : d.toLocaleDateString("en-US", { weekday: "short" })} />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Coaching preview */}
        <div className="rounded-2xl border border-[#161616] bg-[#0c0c0c] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] tracking-[0.25em] text-[#2e2e2e] uppercase">Today&apos;s Coaching</p>
            {coaching && (
              <Link href="/coaching" className="text-[11px] text-[#4a7c59] hover:text-[#7ab88a] flex items-center gap-0.5 transition-colors">
                Full report <ChevronRight size={11} />
              </Link>
            )}
          </div>

          {coaching ? (
            <div>
              <p className="text-[13px] text-[#4a4a4a] leading-relaxed line-clamp-6">
                {coaching.feedback.slice(0, 380)}{coaching.feedback.length > 380 ? "…" : ""}
              </p>
              <div className="mt-4 flex items-center gap-2 pt-4 border-t border-[#0f0f0f]">
                {coaching.focusArea && (
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#4a7c59] bg-[#4a7c59]/10 border border-[#4a7c59]/15 px-2 py-1 rounded-lg">
                    {coaching.focusArea}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-[#c8a96e]" />
                  <span className="text-[12px] text-[#c8a96e] font-medium">{coaching.overallScore}/100</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[13px] text-[#2e2e2e] mb-5 leading-relaxed">
                Your AI coach analyzes your runs, nutrition, and recovery to give personalized daily feedback.
              </p>
              <GenerateCoachingBtn date={today} onGenerated={setCoaching} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
