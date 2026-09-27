import {
  DEFAULT_RARITY_RATES,
  isRarity,
  RARITY_LIST,
  type Rarity,
  type RarityRates,
  TOTAL_RARITY_RATE,
} from "@/lib/constants/rarity";

const RATE_EPSILON = 0.001;

/** 浮動小数の誤差を丸める（0.1% 刻みで扱う） */
export function roundRate(value: number) {
  return Math.round(value * 10) / 10;
}

export function sumRates(rates: RarityRates) {
  return roundRate(RARITY_LIST.reduce((sum, r) => sum + rates[r], 0));
}

export function isValidRarityRates(rates: RarityRates) {
  return (
    RARITY_LIST.every(
      (r) => Number.isFinite(rates[r]) && rates[r] >= 0 && rates[r] <= 100,
    ) && Math.abs(sumRates(rates) - TOTAL_RARITY_RATE) < RATE_EPSILON
  );
}

/** DB に保存された JSON を安全に読み込む。壊れていたら既定値。 */
export function parseRarityRates(json: string | null | undefined): RarityRates {
  if (!json) return { ...DEFAULT_RARITY_RATES };
  try {
    const raw: unknown = JSON.parse(json);
    if (typeof raw !== "object" || raw === null) {
      return { ...DEFAULT_RARITY_RATES };
    }
    const rates = {} as RarityRates;
    for (const r of RARITY_LIST) {
      const v = (raw as Record<string, unknown>)[r];
      rates[r] = typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
    }
    return sumRates(rates) > 0 ? rates : { ...DEFAULT_RARITY_RATES };
  } catch {
    return { ...DEFAULT_RARITY_RATES };
  }
}

/**
 * パックに実際に入っているレア度だけで排出率を正規化する。
 * 例: UR のカードが 1 枚も無ければ、UR の割合は他のレア度へ按分される。
 * 設定上すべて 0% のレア度しか無い場合は、枚数比で均等に割り振る。
 */
export function effectiveRates(
  rates: RarityRates,
  present: Iterable<Rarity>,
  countByRarity?: Partial<Record<Rarity, number>>,
): Partial<RarityRates> {
  const presentSet = new Set(present);
  const active = RARITY_LIST.filter((r) => presentSet.has(r));
  if (active.length === 0) return {};

  const total = active.reduce((sum, r) => sum + rates[r], 0);
  const result: Partial<RarityRates> = {};
  if (total > 0) {
    for (const r of active) result[r] = (rates[r] / total) * 100;
    return result;
  }
  const cardTotal = active.reduce(
    (sum, r) => sum + (countByRarity?.[r] ?? 1),
    0,
  );
  for (const r of active) {
    result[r] = ((countByRarity?.[r] ?? 1) / cardTotal) * 100;
  }
  return result;
}

/**
 * レア度の排出率に従ってカードを count 枚抽選する（重複あり）。
 * rng は [0, 1) を返す関数。テストで差し替えられるよう引数にしている。
 */
export function drawCards<T extends { rarity: Rarity }>(
  pool: readonly T[],
  rates: RarityRates,
  count: number,
  rng: () => number = Math.random,
): T[] {
  if (pool.length === 0 || count <= 0) return [];

  const byRarity = new Map<Rarity, T[]>();
  for (const card of pool) {
    const list = byRarity.get(card.rarity) ?? [];
    list.push(card);
    byRarity.set(card.rarity, list);
  }
  const countByRarity = Object.fromEntries(
    [...byRarity].map(([r, list]) => [r, list.length]),
  ) as Partial<Record<Rarity, number>>;
  const odds = effectiveRates(rates, byRarity.keys(), countByRarity);
  const entries = RARITY_LIST.filter((r) => (odds[r] ?? 0) > 0).map(
    (r) => [r, odds[r] as number] as const,
  );

  const pick = <U>(list: readonly U[]) =>
    list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rng() * 100;
    let acc = 0;
    // 浮動小数誤差で最後まで届かなかった場合に備えて末尾を既定にする
    let rarity = entries[entries.length - 1][0];
    for (const [r, rate] of entries) {
      acc += rate;
      if (roll < acc) {
        rarity = r;
        break;
      }
    }
    result.push(pick(byRarity.get(rarity) as T[]));
  }
  return result;
}

export function highestRarity(rarities: Iterable<Rarity>): Rarity | null {
  let best: Rarity | null = null;
  for (const r of rarities) {
    if (!isRarity(r)) continue;
    if (!best || RARITY_LIST.indexOf(r) > RARITY_LIST.indexOf(best)) best = r;
  }
  return best;
}

/** 合計が 100% になるよう、指定したレア度以外を比例配分で調整する */
export function rebalanceRates(rates: RarityRates, keep: Rarity): RarityRates {
  const fixed = roundRate(Math.min(100, Math.max(0, rates[keep])));
  const others = RARITY_LIST.filter((r) => r !== keep);
  const remaining = roundRate(100 - fixed);
  const otherTotal = others.reduce((sum, r) => sum + Math.max(0, rates[r]), 0);

  const shares = others.map((r) =>
    roundRate(
      otherTotal > 0
        ? (Math.max(0, rates[r]) / otherTotal) * remaining
        : remaining / others.length,
    ),
  );
  // 丸め誤差は一番大きい枠で吸収する
  const diff = roundRate(remaining - shares.reduce((a, b) => a + b, 0));
  const largest = shares.indexOf(Math.max(...shares));
  shares[largest] = roundRate(shares[largest] + diff);

  const next = { ...rates, [keep]: fixed } as RarityRates;
  others.forEach((r, i) => {
    next[r] = shares[i];
  });
  return next;
}
