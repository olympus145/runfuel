"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Utensils, MessageSquare, Settings, LayoutDashboard, Bike, Dumbbell } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/runs", label: "Running", icon: Activity },
  { href: "/bikes", label: "Cycling", icon: Bike },
  { href: "/strength", label: "Strength", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: Utensils },
  { href: "/coaching", label: "Coaching", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-60 flex-col bg-[#070707] border-r border-[#171717] z-40">
        <div className="px-6 pt-8 pb-6 border-b border-[#171717]">
          <p className="text-[9px] tracking-[0.35em] text-[#4a7c59] uppercase font-medium mb-1.5">Training Log</p>
          <h1 className="text-[22px] font-bold text-white tracking-tight leading-none">RunFuel</h1>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-px">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  active
                    ? "bg-[#4a7c59]/12 text-[#7ab88a] border border-[#4a7c59]/20"
                    : "text-[#4a4a4a] hover:text-[#888] hover:bg-[#0f0f0f] border border-transparent"
                }`}>
                <Icon size={15} strokeWidth={active ? 2 : 1.5} />
                <span className={`text-[13px] ${active ? "font-medium" : "font-normal"}`}>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-[#171717]">
          <p className="text-[9px] text-[#222] tracking-[0.2em] uppercase">Powered by Claude</p>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070707]/95 backdrop-blur-sm border-t border-[#171717]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-stretch">
          {nav.slice(0, 6).map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex flex-col items-center justify-center gap-[3px] flex-1 py-3 transition-all ${
                  active ? "text-[#7ab88a]" : "text-[#383838]"
                }`}>
                <Icon size={21} strokeWidth={active ? 2 : 1.5} />
                <span className={`text-[9px] tracking-[0.08em] uppercase ${active ? "text-[#7ab88a]" : "text-[#2e2e2e]"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
