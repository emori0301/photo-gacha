export type Rarity = "N" | "R" | "SR" | "SSR" | "UR";

export const RARITY_COLORS: Record<Rarity, string> = {
  N: "bg-gradient-to-r from-zinc-500 to-zinc-600",
  R: "bg-gradient-to-r from-emerald-500 to-teal-500",
  SR: "bg-gradient-to-r from-cyan-400 to-blue-500",
  SSR: "bg-gradient-to-r from-violet-500 to-purple-600",
  UR: "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500",
};

export const RARITY_LABELS: Record<Rarity, string> = {
  N: "N",
  R: "R",
  SR: "SR",
  SSR: "SSR",
  UR: "UR",
};

export const RARITY_LABELS_JP: Record<Rarity, string> = {
  N: "ノーマル",
  R: "レア",
  SR: "スーパーレア",
  SSR: "ダブルスーパーレア",
  UR: "ウルトラレア",
};

export const RARITY_ORDER: Record<Rarity, number> = {
  N: 1,
  R: 2,
  SR: 3,
  SSR: 4,
  UR: 5,
};

export const RARITY_EFFECTS: Record<Rarity, string> = {
  N: "",
  R: "ring-2 ring-emerald-400 shadow-lg shadow-emerald-400/40",
  SR: "ring-2 ring-cyan-400 shadow-xl shadow-cyan-400/50",
  SSR: "ring-3 ring-violet-500 shadow-2xl shadow-violet-500/60",
  UR: "ring-4 ring-amber-400 shadow-2xl shadow-amber-400/80 animate-pulse",
};

export const RARITY_LIST: readonly Rarity[] = ["N", "R", "SR", "SSR", "UR"] as const;

export type RarityRates = {
  [K in Rarity]: number;
};

export const DEFAULT_RARITY_RATES: RarityRates = {
  N: 40,
  R: 30,
  SR: 20,
  SSR: 8,
  UR: 2,
};

export const TOTAL_RARITY_RATE = 100;
export const RARITY_RATE_TOLERANCE = 0.01;

