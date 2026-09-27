export const RARITY_LIST = ["N", "R", "SR", "SSR", "UR"] as const;

export type Rarity = (typeof RARITY_LIST)[number];

export type RarityRates = Record<Rarity, number>;

export const RARITY_META: Record<
  Rarity,
  { label: string; name: string; order: number }
> = {
  N: { label: "N", name: "ノーマル", order: 1 },
  R: { label: "R", name: "レア", order: 2 },
  SR: { label: "SR", name: "スーパーレア", order: 3 },
  SSR: { label: "SSR", name: "ダブルスーパーレア", order: 4 },
  UR: { label: "UR", name: "ウルトラレア", order: 5 },
};

export const DEFAULT_RARITY_RATES: RarityRates = {
  N: 40,
  R: 30,
  SR: 20,
  SSR: 8,
  UR: 2,
};

export const TOTAL_RARITY_RATE = 100;

export function isRarity(value: unknown): value is Rarity {
  return (
    typeof value === "string" &&
    (RARITY_LIST as readonly string[]).includes(value)
  );
}

export function compareRarity(a: Rarity, b: Rarity) {
  return RARITY_META[a].order - RARITY_META[b].order;
}
