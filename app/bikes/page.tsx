"use client";

import { useEffect, useState } from "react";
import { Bike, Plus, Heart, Zap, Mountain } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface BikeRide {
  id: string; date: string; name: string | null; type: string;
  distanceMiles: number; durationSeconds: number; avgSpeedMph: number | null;
  avgHeartRate: number | null; maxHeartRate: number | null; elevationFt: number | null;
  calories: number | null; avgPower: number | null; cadenceRpm: number | null; trainingLoad: number | null;
}

export default function Bikes() {
  const [rides, setRides] = useState<BikeRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), name: "", type: "bike", distanceMiles: "", durationMin: "", avgHr: "", elevationFt: "", calories: "" });

  useEffect(() => {
    fetch("/api/bikes?limit=50").then(r => r.json()).then(d => { setRides(d || []); setLoading(false); });
  }, []);

  async function addRide() {
    const miles = parseFloat(form.distanceMiles);
    const secs = parseFloat(form.durationMin) * 60;
    if (!miles || !secs) { alert("Distance and duration required"); return; }
    const res = await fetch("/api/bikes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date, name: form.name || null, type: form.type,
        distanceMiles: miles, durationSeconds: secs,
        avgSpeedMph: secs > 0 ? (miles / (secs / 3600)) : null,
        avgHeartRate: form.avgHr ? parseInt(form.avgHr) : null,
        elevationFt: form.elevationFt ? parseFloat(form.elevationFt) : null,
        calories: form.calories ? parseInt(form.calories) : null,
      }),
    });
    const ride = await res.json();
    setRides([ride, ...rides]);
    setShowAdd(false);
    setForm({ date: new Date().toISOString().slice(0, 10), name: "", type: "bike", distanceMiles: "", durationMin: "", avgHr: "", elevationFt: "", calories: "" });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekRides = rides.filter(r => new Date(r.date) >= weekAgo);
  const totalMiles = weekRides.reduce((s, r) => s + r.distanceMiles, 0);
  const totalTime = weekRides.reduce((s, r) => s + r.durationSeconds, 0);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-[#333] text-sm tracking-widest uppercase animate-pulse">Loading</div></div>;

  return (
    <div className="px-4 pt-6 pb-4 md:px-8 md:pt-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-[#3b82f6] uppercase mb-1">Activity Log</p>
          <h2 className="text-2xl font-bold text-white">Cycling</h2>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f0f0f] text-[#555] hover:text-[#888] hover:bg-[#151515] border border-[#1a1a1a] text-sm transition-colors flex-shrink-0">
          <Plus size={14} /> <span className="hidden sm:inline">Log Ride</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0c0c0c] p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-[10px] tracking-[0.2em] text-[#444] uppercase">Miles</span><Bike size={13} color="#3b82f6" strokeWidth={1.5} /></div>
          <p className="text-xl font-bold text-white">{totalMiles.toFixed(1)}</p>
          <p className="text-[10px] text-[#333] mt-0.5">this week</p>
        </div>
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0c0c0c] p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-[10px] tracking-[0.2em] text-[#444] uppercase">Time</span><Zap size={13} color="#c8a96e" strokeWidth={1.5} /></div>
          <p className="text-xl font-bold text-white">{formatDuration(totalTime)}</p>
          <p className="text-[10px] text-[#333] mt-0.5">this week</p>
        </div>
        <div className="rounded-xl border border-[#1e1e1e] bg-[#0c0c0c] p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-[10px] tracking-[0.2em] text-[#444] uppercase">Rides</span><Bike size={13} color="#3b82f6" strokeWidth={1.5} /></div>
          <p className="text-xl font-bold text-white">{weekRides.length}</p>
          <p className="text-[10px] text-[#333] mt-0.5">this week</p>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-[#222] bg-[#0c0c0c] p-6 mb-6">
          <h3 className="text-sm font-medium text-[#888] mb-4">Log a Ride</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div><label className="text-[11px] text-[#444] block mb-1">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="text-[11px] text-[#444] block mb-1">Name</label><input placeholder="Morning ride" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-[11px] text-[#444] block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="bike">Outdoor</option><option value="indoor_bike">Indoor / Zwift</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div><label className="text-[11px] text-[#444] block mb-1">Miles *</label><input type="number" step="0.01" placeholder="25.0" value={form.distanceMiles} onChange={e => setForm({ ...form, distanceMiles: e.target.value })} /></div>
            <div><label className="text-[11px] text-[#444] block mb-1">Duration (min) *</label><input type="number" placeholder="75" value={form.durationMin} onChange={e => setForm({ ...form, durationMin: e.target.value })} /></div>
            <div><label className="text-[11px] text-[#444] block mb-1">Avg HR</label><input type="number" placeholder="145" value={form.avgHr} onChange={e => setForm({ ...form, avgHr: e.target.value })} /></div>
            <div><label className="text-[11px] text-[#444] block mb-1">Elevation (ft)</label><input type="number" placeholder="1200" value={form.elevationFt} onChange={e => setForm({ ...form, elevationFt: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={addRide} className="px-4 py-2 rounded-md bg-[#3b82f6]/20 text-[#60a5fa] hover:bg-[#3b82f6]/30 border border-[#3b82f6]/20 text-sm">Save Ride</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-md text-[#444] hover:text-[#666] text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rides.length === 0 && <p className="text-[#333] text-sm py-8 text-center">No rides yet. Sync your Coros or log manually.</p>}
        {rides.map(ride => (
          <div key={ride.id} className="rounded-xl border border-[#1a1a1a] bg-[#0c0c0c] hover:border-[#252525] p-5 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6] flex-shrink-0" />
              <span className="text-[11px] tracking-[0.2em] text-[#444] uppercase">{ride.type.replace("_", " ")}</span>
              <span className="text-[11px] text-[#333] ml-auto">{new Date(ride.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="flex items-baseline gap-6">
              <div><span className="text-2xl font-bold text-white">{ride.distanceMiles.toFixed(2)}</span><span className="text-sm text-[#444] ml-1">mi</span></div>
              {ride.avgSpeedMph && <div><span className="text-lg font-semibold text-[#888]">{ride.avgSpeedMph.toFixed(1)}</span><span className="text-xs text-[#444] ml-1">mph avg</span></div>}
              <span className="text-[#444] text-sm">{formatDuration(ride.durationSeconds)}</span>
            </div>
            <div className="flex items-center gap-5 mt-3 text-xs text-[#444]">
              {ride.avgHeartRate && <span className="flex items-center gap-1"><Heart size={11} color="#ef4444" />{ride.avgHeartRate} bpm</span>}
              {ride.elevationFt && <span className="flex items-center gap-1"><Mountain size={11} />{ride.elevationFt.toFixed(0)} ft</span>}
              {ride.calories && <span>{ride.calories} kcal</span>}
              {ride.avgPower && <span className="text-[#3b82f6]">{ride.avgPower}W</span>}
              {ride.cadenceRpm && <span>{ride.cadenceRpm} rpm</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
