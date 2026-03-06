import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: "green" | "blue" | "orange" | "purple";
  className?: string;
}

const accentColors = {
  green: "text-[#22c55e] bg-[#22c55e]/10",
  blue: "text-[#3b82f6] bg-[#3b82f6]/10",
  orange: "text-[#f97316] bg-[#f97316]/10",
  purple: "text-[#a855f7] bg-[#a855f7]/10",
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "green",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#252530] bg-[#16161a] p-5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#71717a] uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-[#71717a]">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", accentColors[accent])}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}
