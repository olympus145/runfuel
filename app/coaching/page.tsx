"use client";

import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, Activity, Utensils, Zap } from "lucide-react";

interface CoachingLog {
  id: string; date: string; feedback: string; highlights: string | null;
  runScore: number | null; nutritionScore: number | null; recoveryScore: number | null;
  overallScore: number | null; focusArea: string | null; createdAt: string;
}

function ScoreCircle({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 34; const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[76px] h-[76px]">
        <svg width="76" height="76" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="38" cy="38" r={r} fill="none" stroke="#141414" strokeWidth="5" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-[10px] text-[#444] tracking-[0.15em] uppercase">{label}</span>
    </div>
  );
}

export default function Coaching() {
  const [logs, setLogs] = useState<CoachingLog[]>([]);
  const [selected, setSelected] = useState<CoachingLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    // Load recent coaching logs (last 14 days)
    const promises = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return fetch(`/api/coaching?date=${d}`).then(r => r.json());
    });
    Promise.all(promises).then(results => {
      const valid = results.filter(Boolean).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLogs(valid);
      if (valid.length > 0) setSelected(valid[0]);
      setLoading(false);
    });
  }, []);

  async function generateCoaching() {
    setGenerating(true);
    try {
      const res = await fetch("/api/coaching", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: today }) });
      const log = await res.json();
      if (!log.error) {
        setLogs([log, ...logs.filter(l => l.date.slice(0, 10) !== today)]);
        setSelected(log);
      }
    } finally { setGenerating(false); }
  }

  const todayLog = logs.find(l => l.date.slice(0, 10) === today);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-[#333] text-sm tracking-widest uppercase animate-pulse">Loading</div></div>;

  return (
    <div className="px-4 pt-6 pb-4 md:px-8 md:pt-10 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-[#c8a96e] uppercase mb-1">AI Coaching</p>
          <h2 className="text-2xl font-bold text-white">Your Coach</h2>
          <p className="text-sm text-[#444] mt-1">Powered by Claude · Learns from your history</p>
        </div>
        <button onClick={generateCoaching} disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#c8a96e]/15 text-[#c8a96e] hover:bg-[#c8a96e]/25 border border-[#c8a96e]/20 text-sm transition-colors disabled:opacity-40">
          <RefreshCw size={13} className={generating ? "animate-spin" : ""} />
          {generating ? "Generating…" : todayLog ? "Regenerate Today" : "Get Today's Coaching"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Log list */}
        <div className="col-span-1">
          <h3 className="text-[10px] tracking-[0.2em] text-[#444] uppercase mb-3">History</h3>
          {logs.length === 0 && (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#0c0c0c] p-6 text-center">
              <p className="text-sm text-[#444]">No coaching yet.</p>
              <p className="text-xs text-[#333] mt-1">Generate your first session above.</p>
            </div>
          )}
          <div className="space-y-1.5">
            {logs.map(log => {
              const isToday = log.date.slice(0, 10) === today;
              const isSelected = selected?.id === log.id;
              return (
                <button key={log.id} onClick={() => setSelected(log)}
                  className={`w-full text-left rounded-lg border p-3.5 transition-all ${isSelected ? "border-[#c8a96e]/30 bg-[#c8a96e]/5" : "border-[#1a1a1a] bg-[#0c0c0c] hover:border-[#222]"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isSelected ? "text-[#c8a96e]" : "text-[#888]"}`}>
                      {isToday ? "Today" : new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className={`text-sm font-bold ${isSelected ? "text-white" : "text-[#555]"}`}>{log.overallScore}</span>
                  </div>
                  {log.focusArea && <p className="text-[10px] text-[#444] mt-1 capitalize tracking-wide">{log.focusArea}</p>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Coaching detail */}
        <div className="md:col-span-2">
          {selected ? (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#0c0c0c] p-6">
              {/* Date + focus */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-[#444] uppercase">
                    {selected.date.slice(0, 10) === today ? "Today" : new Date(selected.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                  {selected.focusArea && (
                    <p className="text-sm text-[#c8a96e] mt-0.5 capitalize tracking-wide">{selected.focusArea} focus</p>
                  )}
                </div>
                <TrendingUp size={16} color="#444" />
              </div>

              {/* Scores */}
              <div className="flex items-center gap-6 pb-6 mb-6 border-b border-[#141414]">
                <ScoreCircle score={selected.overallScore ?? 0} label="Overall" color="#c8a96e" />
                <div className="w-px h-12 bg-[#141414]" />
                <ScoreCircle score={selected.runScore ?? 0} label="Run" color="#4a7c59" />
                <ScoreCircle score={selected.nutritionScore ?? 0} label="Nutrition" color="#3b82f6" />
                <ScoreCircle score={selected.recoveryScore ?? 0} label="Recovery" color="#a855f7" />
              </div>

              {/* Highlights */}
              {selected.highlights && (() => {
                try {
                  const h: string[] = JSON.parse(selected.highlights);
                  return (
                    <div className="mb-6">
                      <p className="text-[10px] tracking-[0.2em] text-[#444] uppercase mb-3">Key Points</p>
                      <ul className="space-y-2">
                        {h.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-[#888]">
                            <span className="text-[#4a7c59] mt-0.5 flex-shrink-0">—</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                } catch { return null; }
              })()}

              {/* Full feedback */}
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#444] uppercase mb-3">Coaching Report</p>
                <div className="text-sm text-[#888] leading-relaxed space-y-3">
                  {selected.feedback.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-[#141414] flex items-center gap-2 text-[10px] text-[#333]">
                <Zap size={10} /><span>Generated by Claude</span>
                <span className="ml-auto">{new Date(selected.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#0c0c0c] p-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-4 text-[#333]">
                <Activity size={20} /><Utensils size={20} /><TrendingUp size={20} />
              </div>
              <p className="text-sm text-[#444] mb-1">Your personal coach analyzes</p>
              <p className="text-sm text-[#333]">running, cycling, strength, and nutrition together</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
