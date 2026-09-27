import { describe, expect, it } from "vitest";
import {
  DEFAULT_RARITY_RATES,
  RARITY_LIST,
  type Rarity,
} from "@/lib/constants/rarity";
import {
  drawCards,
  effectiveRates,
  highestRarity,
  isValidRarityRates,
  parseRarityRates,
  rebalanceRates,
  sumRates,
} from "@/lib/gacha";

/** 決まった値を順番に返す乱数 */
function seq(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

/** 再現性のある擬似乱数（mulberry32） */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const card = (id: string, rarity: Rarity) => ({ id, rarity });

describe("parseRarityRates", () => {
  it("正しい JSON を読み込む", () => {
    expect(parseRarityRates('{"N":50,"R":50,"SR":0,"SSR":0,"UR":0}')).toEqual({
      N: 50,
      R: 50,
      SR: 0,
      SSR: 0,
      UR: 0,
    });
  });

  it("壊れた値や空は既定値にする", () => {
    for (const bad of [null, "", "not json", "null", "[]", "42", '{"N":"x"}']) {
      expect(parseRarityRates(bad)).toEqual(DEFAULT_RARITY_RATES);
    }
  });

  it("負の値や欠けたキーは 0 として扱う", () => {
    expect(parseRarityRates('{"N":-5,"UR":100}')).toEqual({
      N: 0,
      R: 0,
      SR: 0,
      SSR: 0,
      UR: 100,
    });
  });

  it("既定値のオブジェクトを共有しない", () => {
    const a = parseRarityRates(null);
    a.N = 0;
    expect(DEFAULT_RARITY_RATES.N).toBe(40);
  });
});

describe("isValidRarityRates", () => {
  it("合計 100 のみ有効", () => {
    expect(isValidRarityRates(DEFAULT_RARITY_RATES)).toBe(true);
    expect(
      isValidRarityRates({ N: 33.3, R: 33.3, SR: 33.4, SSR: 0, UR: 0 }),
    ).toBe(true);
    expect(isValidRarityRates({ N: 50, R: 49, SR: 0, SSR: 0, UR: 0 })).toBe(
      false,
    );
    expect(isValidRarityRates({ N: 150, R: -50, SR: 0, SSR: 0, UR: 0 })).toBe(
      false,
    );
    expect(
      isValidRarityRates({ N: Number.NaN, R: 100, SR: 0, SSR: 0, UR: 0 }),
    ).toBe(false);
  });
});

describe("effectiveRates", () => {
  it("存在するレア度だけで 100% に正規化する", () => {
    const odds = effectiveRates(DEFAULT_RARITY_RATES, ["N", "UR"]);
    expect(odds.N).toBeCloseTo((40 / 42) * 100);
    expect(odds.UR).toBeCloseTo((2 / 42) * 100);
    expect(odds.R).toBeUndefined();
  });

  it("存在するレア度がすべて 0% なら枚数比で配分する", () => {
    const odds = effectiveRates(
      { N: 0, R: 0, SR: 0, SSR: 0, UR: 100 },
      ["N", "R"],
      { N: 3, R: 1 },
    );
    expect(odds).toEqual({ N: 75, R: 25 });
  });

  it("カードが無ければ空", () => {
    expect(effectiveRates(DEFAULT_RARITY_RATES, [])).toEqual({});
  });
});

describe("drawCards", () => {
  const pool = [
    card("n1", "N"),
    card("n2", "N"),
    card("r1", "R"),
    card("ur1", "UR"),
  ];

  it("指定枚数を返す（プールより多くても重複で埋める）", () => {
    const one = [card("only", "SR")];
    expect(drawCards(one, DEFAULT_RARITY_RATES, 5)).toHaveLength(5);
    expect(drawCards(pool, DEFAULT_RARITY_RATES, 5)).toHaveLength(5);
  });

  it("空のプールや 0 枚は空配列", () => {
    expect(drawCards([], DEFAULT_RARITY_RATES, 5)).toEqual([]);
    expect(drawCards(pool, DEFAULT_RARITY_RATES, 0)).toEqual([]);
  });

  it("乱数の境界値でも必ずプール内のカードを返す", () => {
    const ids = new Set(pool.map((c) => c.id));
    for (const r of [0, 0.5, 0.999999999, 0.9999999999999999]) {
      const [c] = drawCards(pool, DEFAULT_RARITY_RATES, 1, () => r);
      expect(ids.has(c.id)).toBe(true);
    }
  });

  it("0% のレア度は出ない", () => {
    const rates = { N: 100, R: 0, SR: 0, SSR: 0, UR: 0 };
    const result = drawCards(pool, rates, 500, seeded(1));
    expect(result.every((c) => c.rarity === "N")).toBe(true);
  });

  it("レア度の順に累積して判定する", () => {
    // N:40 R:30 UR:2 → 正規化後 N≈55.6, R≈41.7, UR≈2.8
    const [low] = drawCards(pool, DEFAULT_RARITY_RATES, 1, seq(0.1, 0));
    const [mid] = drawCards(pool, DEFAULT_RARITY_RATES, 1, seq(0.7, 0));
    const [top] = drawCards(pool, DEFAULT_RARITY_RATES, 1, seq(0.99, 0));
    expect(low.rarity).toBe("N");
    expect(mid.rarity).toBe("R");
    expect(top.rarity).toBe("UR");
  });

  it("大量試行で排出率に近づく", () => {
    const big = RARITY_LIST.map((r) => card(r, r));
    const n = 40_000;
    const result = drawCards(big, DEFAULT_RARITY_RATES, n, seeded(42));
    for (const r of RARITY_LIST) {
      const ratio = (result.filter((c) => c.rarity === r).length / n) * 100;
      expect(Math.abs(ratio - DEFAULT_RARITY_RATES[r])).toBeLessThan(1);
    }
  });
});

describe("highestRarity", () => {
  it("一番高いレア度を返す", () => {
    expect(highestRarity(["N", "SSR", "R"])).toBe("SSR");
    expect(highestRarity([])).toBeNull();
  });
});

describe("rebalanceRates", () => {
  it("変更したレア度を固定して合計 100 にする", () => {
    const next = rebalanceRates({ ...DEFAULT_RARITY_RATES, UR: 10 }, "UR");
    expect(next.UR).toBe(10);
    expect(sumRates(next)).toBe(100);
    expect(isValidRarityRates(next)).toBe(true);
  });

  it("100% にすると他はすべて 0", () => {
    const next = rebalanceRates({ ...DEFAULT_RARITY_RATES, N: 100 }, "N");
    expect(next).toEqual({ N: 100, R: 0, SR: 0, SSR: 0, UR: 0 });
  });

  it("他がすべて 0 なら均等に配る", () => {
    const next = rebalanceRates({ N: 0, R: 0, SR: 0, SSR: 0, UR: 20 }, "UR");
    expect(next).toEqual({ N: 20, R: 20, SR: 20, SSR: 20, UR: 20 });
  });

  it("残りがごく少ないときも負の値にならない", () => {
    const next = rebalanceRates({ N: 0, R: 0, SR: 0, SSR: 0, UR: 99.8 }, "UR");
    expect(sumRates(next)).toBe(100);
    expect(isValidRarityRates(next)).toBe(true);
    for (const r of RARITY_LIST) expect(next[r]).toBeGreaterThanOrEqual(0);
  });

  it("どんな入力でも合計 100・負の値なしになる", () => {
    const rng = seeded(7);
    for (let i = 0; i < 2000; i++) {
      const rates = Object.fromEntries(
        RARITY_LIST.map((r) => [r, Math.round(rng() * 1000) / 10]),
      ) as Record<Rarity, number>;
      const keep = RARITY_LIST[Math.floor(rng() * 5)];
      // 残りが 1% 未満になるケースも多めに混ぜる
      if (i % 3 === 0) rates[keep] = 99 + Math.round(rng() * 10) / 10;
      if (i % 5 === 0)
        for (const r of RARITY_LIST) if (r !== keep) rates[r] = 0;
      const next = rebalanceRates(rates, keep);
      expect(sumRates(next)).toBe(100);
      for (const r of RARITY_LIST) expect(next[r]).toBeGreaterThanOrEqual(0);
    }
  });
});
