"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Plus, CheckCircle } from "lucide-react";

interface StrengthLog {
  id: string; date: string; type: string; durationMin: number | null; notes: string | null; exercises: string | null;
}

const TYPES = [
  { value: "strength", label: "Strength", color: "#a855f7" },
  { value: "core", label: "Core", color: "#f97316" },
  { value: "hiit", label: "HIIT", color: "#ef4444" },
  { value: "yoga", label: "Yoga", color: "#06b6d4" },
  { value: "crossfit", label: "CrossFit", color: "#eab308" },
];
const typeColor = (t: string) => TYPES.find(x => x.value === t)?.color ?? "#555";
const typeLabel = (t: string) => TYPES.find(x => x.value === t)?.label ?? t;

export default function Strength() {
  const [logs, setLogs] = useState<StrengthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), type: "strength", durationMin: "", notes: "" });

  useEffect(() => {
    fetch("/api/strength?weeks=8").then(r => r.json()).then(d => { setLogs(d || []); setLoading(false); });
  }, []);

  async function addLog() {
    const res = await fetch("/api/strength", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: form.date, type: form.type, durationMin: form.durationMin ? parseInt(form.durationMin) : null, notes: form.notes || null }),
    });
    const log = await res.json();
    setLogs([log, ...logs]);
    setShowAdd(false);
    setForm({ date: new Date().toISOString().slice(0, 10), type: "strength", durationMin: "", notes: "" });
  }

  // Weekly breakdown
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = logs.filter(l => new Date(l.date) >= weekAgo);
  const strengthDays = thisWeek.filter(l => l.type === "strength" || l.type === "hiit" || l.type === "crossfit").length;
  const coreDays = thisWeek.filter(l => l.type === "core" || l.type === "yoga").length;

  // Build a 7-day calendar view
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    const dayLogs = logs.filter(l => l.date.slice(0, 10) === iso);
    return { iso, label: d.toLocaleDateString("en-US", { weekday: "short" }), logs: dayLogs };
  });

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-[#333] text-sm tracking-widest uppercase animate-pulse">Loading</div></div>;

  return (
    <div className="px-4 pt-6 pb-4 md:px-8 md:pt-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-[#a855f7] uppercase mb-1">Activity Log</p>
          <h2 className="text-2xl font-bold text-white">Strength & Core</h2>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f0f0f] text-[#555] hover:text-[#888] hover:bg-[#151515] border border-[#1a1a1a] text-sm transition-colors flex-shrink-0">
          <Plus size={14} /> <span className="hidden sm:inline">Log Workout</span>
        </button>
      </div>

      {/* Weekly view */}
      <div className="rounded-xl border border-[#1e1e1e] bg-[#0c0c0c] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] tracking-[0.2em] text-[#444] uppercase">This Week</p>
          <div className="flex items-center gap-4 text-xs text-[#555]">
            <span><span className="text-[#a855f7]">{strengthDays}</span> strength day{strengthDays !== 1 ? "s" : ""}</span>
            <span><span className="text-[#f97316]">{coreDays}</span> core day{coreDays !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map(({ iso, label, logs: dayLogs }) => (
            <div key={iso} className="text-center">
              <p className="text-[10px] text-[#333] uppercase mb-2">{label}</p>
              <div className={`h-12 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors
                ${dayLogs.length > 0 ? "border-[#252525] bg-[#141414]" : "border-[#111] bg-[#0a0a0a]"}`}>
                {dayLogs.length > 0 ? (
                  dayLogs.map((l, i) => (
                    <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColor(l.type) }} title={typeLabel(l.type)} />
                  ))
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a]" />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-[10px] text-[#333]">
          {TYPES.map(t => (
            <span key={t.value} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />{t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border border-[#222] bg-[#0c0c0c] p-6 mb-6">
          <h3 className="text-sm font-medium text-[#888] mb-4">Log a Workout</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div><label className="text-[11px] text-[#444] block mb-1">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="text-[11px] text-[#444] block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div><label className="text-[11px] text-[#444] block mb-1">Duration (min)</label><input type="number" placeholder="45" value={form.durationMin} onChange={e => setForm({ ...form, durationMin: e.target.value })} /></div>
          </div>
          <div className="mb-4"><label className="text-[11px] text-[#444] block mb-1">Notes</label><textarea rows={2} placeholder="Squats, deadlifts, bench…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="resize-none" /></div>
          <div className="flex gap-2">
            <button onClick={addLog} className="px-4 py-2 rounded-md bg-[#a855f7]/20 text-[#c084fc] hover:bg-[#a855f7]/30 border border-[#a855f7]/20 text-sm">Save Workout</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-md text-[#444] hover:text-[#666] text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Log */}
      <div className="space-y-2">
        {logs.length === 0 && <p className="text-[#333] text-sm py-8 text-center">No workouts logged yet.</p>}
        {logs.map(log => (
          <div key={log.id} className="rounded-xl border border-[#1a1a1a] bg-[#0c0c0c] hover:border-[#252525] p-4 transition-colors flex items-center gap-4">
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${typeColor(log.type)}18` }}>
              {log.type === "core" || log.type === "yoga" ? <CheckCircle size={15} color={typeColor(log.type)} /> : <Dumbbell size={15} color={typeColor(log.type)} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#ccc]">{typeLabel(log.type)}</span>
                {log.durationMin && <span className="text-xs text-[#444]">{log.durationMin}m</span>}
                {log.notes && <span className="text-xs text-[#333] truncate max-w-xs">{log.notes}</span>}
              </div>
              <p className="text-xs text-[#333] mt-0.5">{new Date(log.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
