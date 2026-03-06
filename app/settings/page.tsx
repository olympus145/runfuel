"use client";

import { useEffect, useState } from "react";
import { Link2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface User {
  name: string | null; corosConnected: boolean;
  weeklyRunMilesGoal: number | null; weeklyBikeMilesGoal: number | null;
  strengthDaysGoal: number | null; coreDaysGoal: number | null;
  dailyCalorieGoal: number | null; dailyProteinGoal: number | null;
  weightGoal: number | null; currentWeight: number | null;
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", weeklyRunMilesGoal: "", weeklyBikeMilesGoal: "", strengthDaysGoal: "", coreDaysGoal: "", dailyCalorieGoal: "", dailyProteinGoal: "", weightGoal: "", currentWeight: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "coros") setSyncResult("✓ Coros connected successfully");
    if (params.get("error")) setSyncResult("✗ Failed to connect Coros. Check your credentials.");
  }, []);

  useEffect(() => {
    fetch("/api/user").then(r => r.json()).then((u: User) => {
      setUser(u);
      setForm({
        name: u.name ?? "",
        weeklyRunMilesGoal: u.weeklyRunMilesGoal?.toString() ?? "",
        weeklyBikeMilesGoal: u.weeklyBikeMilesGoal?.toString() ?? "",
        strengthDaysGoal: u.strengthDaysGoal?.toString() ?? "",
        coreDaysGoal: u.coreDaysGoal?.toString() ?? "",
        dailyCalorieGoal: u.dailyCalorieGoal?.toString() ?? "",
        dailyProteinGoal: u.dailyProteinGoal?.toString() ?? "",
        weightGoal: u.weightGoal?.toString() ?? "",
        currentWeight: u.currentWeight?.toString() ?? "",
      });
    });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/user", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || null,
        weeklyRunMilesGoal: form.weeklyRunMilesGoal ? parseFloat(form.weeklyRunMilesGoal) : null,
        weeklyBikeMilesGoal: form.weeklyBikeMilesGoal ? parseFloat(form.weeklyBikeMilesGoal) : null,
        strengthDaysGoal: form.strengthDaysGoal ? parseInt(form.strengthDaysGoal) : null,
        coreDaysGoal: form.coreDaysGoal ? parseInt(form.coreDaysGoal) : null,
        dailyCalorieGoal: form.dailyCalorieGoal ? parseInt(form.dailyCalorieGoal) : null,
        dailyProteinGoal: form.dailyProteinGoal ? parseInt(form.dailyProteinGoal) : null,
        weightGoal: form.weightGoal ? parseFloat(form.weightGoal) : null,
        currentWeight: form.currentWeight ? parseFloat(form.currentWeight) : null,
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function syncCoros() {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch("/api/coros/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) { setSyncResult(`✗ ${data.error}`); }
      else { setSyncResult(`✓ Synced ${data.syncedRuns} runs, ${data.syncedBikes} rides (${data.skipped} already up to date)`); }
    } finally { setSyncing(false); }
  }

  if (!user) return <div className="flex items-center justify-center h-screen"><div className="text-[#333] text-sm tracking-widest uppercase animate-pulse">Loading</div></div>;

  return (
    <div className="px-4 pt-6 pb-4 md:px-8 md:pt-10 max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.3em] text-[#555] uppercase mb-1">Configuration</p>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
      </div>

      {/* Coros section */}
      <Section title="Coros Integration" accent="#4a7c59">
        <div className="flex items-center justify-between p-4 rounded-lg bg-[#111] border border-[#1a1a1a] mb-4">
          <div className="flex items-center gap-3">
            {user.corosConnected ? <CheckCircle size={16} color="#4a7c59" /> : <AlertCircle size={16} color="#555" />}
            <div>
              <p className="text-sm text-[#ccc]">{user.corosConnected ? "Coros Connected" : "Not Connected"}</p>
              <p className="text-xs text-[#444]">{user.corosConnected ? "Syncs automatically from your watch" : "Connect to auto-sync runs and rides"}</p>
            </div>
          </div>
          {user.corosConnected ? (
            <button onClick={syncCoros} disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs bg-[#4a7c59]/15 text-[#7ab88a] border border-[#4a7c59]/20 hover:bg-[#4a7c59]/25 disabled:opacity-40 transition-colors">
              <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
          ) : (
            <a href="/api/coros/connect"
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs bg-[#4a7c59]/15 text-[#7ab88a] border border-[#4a7c59]/20 hover:bg-[#4a7c59]/25 transition-colors">
              <Link2 size={11} /> Connect
            </a>
          )}
        </div>
        {syncResult && (
          <p className={`text-xs px-3 py-2 rounded ${syncResult.startsWith("✓") ? "text-[#7ab88a] bg-[#4a7c59]/10" : "text-[#f87171] bg-[#ef4444]/10"}`}>
            {syncResult}
          </p>
        )}
        <p className="text-xs text-[#333] mt-3">
          Register your app at <span className="text-[#444]">open.coros.com</span> and add your COROS_CLIENT_ID and COROS_CLIENT_SECRET to .env
        </p>
      </Section>

      {/* Profile */}
      <Section title="Profile" accent="#555">
        <div><label className="Field-label">Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></div>
      </Section>

      {/* Training goals */}
      <Section title="Training Goals" accent="#4a7c59">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="Field-label">Weekly Run Miles</label><input type="number" step="0.1" value={form.weeklyRunMilesGoal} onChange={e => setForm({ ...form, weeklyRunMilesGoal: e.target.value })} placeholder="30" /></div>
          <div><label className="Field-label">Weekly Bike Miles</label><input type="number" step="0.1" value={form.weeklyBikeMilesGoal} onChange={e => setForm({ ...form, weeklyBikeMilesGoal: e.target.value })} placeholder="50" /></div>
          <div><label className="Field-label">Strength Days / Week</label><input type="number" value={form.strengthDaysGoal} onChange={e => setForm({ ...form, strengthDaysGoal: e.target.value })} placeholder="3" /></div>
          <div><label className="Field-label">Core Days / Week</label><input type="number" value={form.coreDaysGoal} onChange={e => setForm({ ...form, coreDaysGoal: e.target.value })} placeholder="4" /></div>
        </div>
      </Section>

      {/* Nutrition goals */}
      <Section title="Nutrition Goals" accent="#c8a96e">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="Field-label">Daily Calories (kcal)</label><input type="number" value={form.dailyCalorieGoal} onChange={e => setForm({ ...form, dailyCalorieGoal: e.target.value })} placeholder="2400" /></div>
          <div><label className="Field-label">Daily Protein (g)</label><input type="number" value={form.dailyProteinGoal} onChange={e => setForm({ ...form, dailyProteinGoal: e.target.value })} placeholder="160" /></div>
        </div>
      </Section>

      {/* Body */}
      <Section title="Body" accent="#a855f7">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="Field-label">Current Weight (lbs)</label><input type="number" step="0.1" value={form.currentWeight} onChange={e => setForm({ ...form, currentWeight: e.target.value })} placeholder="165" /></div>
          <div><label className="Field-label">Goal Weight (lbs)</label><input type="number" step="0.1" value={form.weightGoal} onChange={e => setForm({ ...form, weightGoal: e.target.value })} placeholder="158" /></div>
        </div>
      </Section>

      <button onClick={save} disabled={saving}
        className="w-full py-3 rounded-lg bg-[#4a7c59]/20 text-[#7ab88a] hover:bg-[#4a7c59]/30 border border-[#4a7c59]/20 text-sm font-medium transition-colors disabled:opacity-40 mt-2">
        {saved ? "✓ Saved" : saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-[#1a1a1a] bg-[#0c0c0c] p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="text-xs font-medium text-[#666] tracking-[0.15em] uppercase">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
