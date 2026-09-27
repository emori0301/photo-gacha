import type { Rarity } from "@/lib/constants/rarity";
import { cn } from "@/lib/utils";

const TOP: Record<Rarity, string> = {
  N: "#b9b2a8",
  R: "#2c9a66",
  SR: "#2f6fd0",
  SSR: "#8a4bd6",
  UR: "url(#capsule-rainbow)",
};

/** 上半分の色でレア度を匂わせるカプセル */
export function Capsule({
  rarity,
  opening = false,
  className,
}: {
  rarity: Rarity;
  opening?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 80 80"
      aria-hidden="true"
      className={cn("overflow-visible", className)}
    >
      <defs>
        <linearGradient id="capsule-rainbow" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffd93d" />
          <stop offset=".35" stopColor="#ff6b6b" />
          <stop offset=".65" stopColor="#c77dff" />
          <stop offset="1" stopColor="#4d96ff" />
        </linearGradient>
      </defs>
      <g
        className={opening ? "capsule-bottom-open" : undefined}
        style={{ transformOrigin: "40px 40px" }}
      >
        <path
          d="M6 40h68a34 34 0 0 1-68 0Z"
          fill="var(--color-card)"
          stroke="var(--color-ink)"
          strokeWidth="3"
        />
      </g>
      <g
        className={opening ? "capsule-top-open" : undefined}
        style={{ transformOrigin: "40px 40px" }}
      >
        <path
          d="M6 40a34 34 0 0 1 68 0Z"
          fill={TOP[rarity]}
          stroke="var(--color-ink)"
          strokeWidth="3"
        />
        <path
          d="M18 26a22 22 0 0 1 12-10"
          stroke="#fff"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity=".7"
        />
      </g>
    </svg>
  );
}
