"use client";

interface ScoreRingProps {
  score: number;
  label: string;
  size?: number;
  color?: string;
}

export function ScoreRing({
  score,
  label,
  size = 80,
  color = "#22c55e",
}: ScoreRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#252530"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute" style={{ marginTop: size / 2 - 14 }}>
      </div>
      {/* Overlay text */}
      <div
        className="relative -mt-[calc(100%+8px)] flex flex-col items-center justify-center"
        style={{ height: size }}
      >
        <span className="text-xl font-bold text-white">{score}</span>
      </div>
      <span className="text-xs text-[#71717a]">{label}</span>
    </div>
  );
}

// Simpler inline version
export function ScoreCircle({
  score,
  label,
  color = "#22c55e",
}: {
  score: number;
  label: string;
  color?: string;
}) {
  const size = 80;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={40} cy={40} r={radius} fill="none" stroke="#252530" strokeWidth={6} />
          <circle
            cx={40}
            cy={40}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-xs text-[#71717a]">{label}</span>
    </div>
  );
}
