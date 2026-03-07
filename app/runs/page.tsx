"use client";

import { useEffect, useState } from "react";
import { Activity, Plus, Heart, TrendingUp, Mountain } from "lucide-react";
import { formatPaceMile, formatDuration } from "@/lib/utils";

interface Run {
  id: string; date: string; name: string | null; type: string;
  distanceMiles: number; durationSeconds: number; avgPaceSecMile: number | null;
  avgHeartRate: number | null; maxHeartRate: number | null; elevationFt: number | null;
  calories: number | null; vo2max: number | null; trainingLoad: number | null;
  aerobicEffect: number | null; cadence: number | null; hrv: number | null;
}

const TYPE_COLORS: Record<string, string> = {
  run: "#4a7c59", trail: "#c8a96e", track: "#3b82f6", treadmill: "#555",
};

export default function Runs() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), name: "", type: "run", distanceMiles: "", durationMin: "", avgHr: "", elevationFt: "", calories: "" });

  useEffect(() => {
    fetch("/api/runs?limit=50").then(r => r.json()).then(d => { setRuns(d || []); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function addRun() {
    const miles = parseFloat(form.distanceMiles);
    const secs = parseFloat(form.durationMin) * 60;
    if (!miles || !secs) { alert("Distance and duration required"); return; }
    const avgPaceSecMile = secs / miles;
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date, name: form.name || null, type: form.type,
        distanceMiles: miles, durationSeconds: secs, avgPaceSecMile,
        avgHeartRate: form.avgHr ? parseInt(form.avgHr) : null,
        elevationFt: form.elevationFt ? parseFloat(form.elevationFt) : null,
        calories: form.calories ? parseInt(form.calories) : null,
      }),
    });
    const run = await res.json();
    setRuns([run, ...runs]);
    setShowAdd(false);
    setForm({ date: new Date().toISOString().slice(0, 10), name: "", type: "run", distanceMiles: "", durationMin: "", avgHr: "", elevationFt: "", calories: "" });
  }

  // Weekly stats
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekRuns = runs.filter(r => new Date(r.date) >= weekAgo);
  const totalMiles = weekRuns.reduce((s, r) => s + r.distanceMiles, 0);
  const totalTime = weekRuns.reduce((s, r) => s + r.durationSeconds, 0);
  const avgHr = weekRuns.filter(r => r.avgHeartRate).reduce((s, r, _, a) => s + r.avgHeartRate! / a.length, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-[#666] text-sm tracking-widest uppercase animate-pulse">Loading</div>
    </div>
  );

  return (
    <div className="px-4 pt-8 pb-6 md:px-8 md:pt-12 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-[#4a7c59] uppercase mb-1">Activity Log</p>
          <h2 className="text-2xl font-bold text-white">Running</h2>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111] text-[#777] hover:text-[#aaa] hover:bg-[#181818] border border-[#1e1e1e] text-sm transition-colors flex-shrink-0">
          <Plus size={14} /> <span className="hidden sm:inline">Log Run</span>
        </button>
      </div>

      {/* Week summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Miles", value: totalMiles.toFixed(1), icon: Activity, color: "#4a7c59" },
          { label: "Time", value: formatDuration(totalTime), icon: TrendingUp, color: "#c8a96e" },
          { label: "Runs", value: weekRuns.length, icon: Activity, color: "#3b82f6" },
          { label: "Avg HR", value: avgHr ? `${Math.round(avgHr)}` : "—", icon: Heart, color: "#ef4444" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-[#1a1a1a] bg-[#0c0c0c] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] tracking-[0.2em] text-[#666] uppercase">{label}</span>
              <Icon size={13} color={color} strokeWidth={1.5} />
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-[10px] text-[#666] mt-1">this week</p>
          </div>
        ))}
      </div>

      {/* Add run form */}
      {showAdd && (
        <div className="rounded-xl border border-[#252525] bg-[#0c0c0c] p-6 mb-6">
          <h3 className="text-sm font-medium text-[#aaa] mb-5 tracking-wide">Log a Run</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div><label className="Field-label">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="Field-label">Name (optional)</label><input placeholder="Morning run" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="Field-label">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="run">Road Run</option><option value="trail">Trail</option>
                <option value="track">Track</option><option value="treadmill">Treadmill</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-5">
            <div><label className="Field-label">Miles *</label><input type="number" step="0.01" placeholder="6.2" value={form.distanceMiles} onChange={e => setForm({ ...form, distanceMiles: e.target.value })} /></div>
            <div><label className="Field-label">Duration (min) *</label><input type="number" placeholder="50" value={form.durationMin} onChange={e => setForm({ ...form, durationMin: e.target.value })} /></div>
            <div><label className="Field-label">Avg HR</label><input type="number" placeholder="155" value={form.avgHr} onChange={e => setForm({ ...form, avgHr: e.target.value })} /></div>
            <div><label className="Field-label">Elevation (ft)</label><input type="number" placeholder="420" value={form.elevationFt} onChange={e => setForm({ ...form, elevationFt: e.target.value })} /></div>
            <div><label className="Field-label">Calories</label><input type="number" placeholder="600" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={addRun} className="px-4 py-2 rounded-md bg-[#4a7c59]/20 text-[#7ab88a] hover:bg-[#4a7c59]/30 border border-[#4a7c59]/20 text-sm">Save Run</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-md text-[#777] hover:text-[#aaa] text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Run list */}
      <div className="space-y-2">
        {runs.length === 0 && <p className="text-[#666] text-sm py-10 text-center">No runs yet. Sync your Coros or log manually.</p>}
        {runs.map(run => (
          <div key={run.id} className="rounded-xl border border-[#1a1a1a] bg-[#0c0c0c] hover:border-[#282828] transition-colors p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[run.type] ?? "#4a7c59" }} />
              <span className="text-[11px] tracking-[0.2em] text-[#777] uppercase">{run.type}</span>
              <span className="text-[11px] text-[#666] ml-auto">{new Date(run.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            {run.name && <p className="text-sm text-[#aaa] mb-2">{run.name}</p>}
            <div className="flex items-baseline gap-6">
              <div>
                <span className="text-2xl font-bold text-white">{run.distanceMiles.toFixed(2)}</span>
                <span className="text-sm text-[#777] ml-1">mi</span>
              </div>
              {run.avgPaceSecMile && (
                <div>
                  <span className="text-lg font-semibold text-[#bbb]">{formatPaceMile(run.avgPaceSecMile)}</span>
                  <span className="text-xs text-[#777] ml-1">/mi</span>
                </div>
              )}
              <span className="text-[#888] text-sm">{formatDuration(run.durationSeconds)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[#777]">
              {run.avgHeartRate && <span className="flex items-center gap-1"><Heart size={11} color="#ef4444" />{run.avgHeartRate} avg · {run.maxHeartRate ?? "—"} max</span>}
              {run.elevationFt && <span className="flex items-center gap-1"><Mountain size={11} />{run.elevationFt.toFixed(0)} ft</span>}
              {run.calories && <span>{run.calories} kcal</span>}
              {run.vo2max && <span className="text-[#4a7c59]">VO₂max {run.vo2max.toFixed(1)}</span>}
              {run.trainingLoad && <span>Load {run.trainingLoad.toFixed(0)}</span>}
              {run.aerobicEffect && <span>Aerobic {run.aerobicEffect.toFixed(1)}</span>}
              {run.hrv && <span>HRV {run.hrv}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
