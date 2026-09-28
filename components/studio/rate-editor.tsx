"use client";

import { AlertTriangle } from "lucide-react";
import { RarityTag } from "@/components/cards/rarity";
import {
  RARITY_LIST,
  type Rarity,
  type RarityRates,
} from "@/lib/constants/rarity";
import {
  effectiveRates,
  rebalanceRates,
  roundRate,
  sumRates,
} from "@/lib/gacha";
import { cn, formatPercent } from "@/lib/utils";

export function RateEditor({
  rates,
  onChange,
  autoBalance,
  onAutoBalanceChange,
  countByRarity,
}: {
  rates: RarityRates;
  onChange: (rates: RarityRates) => void;
  autoBalance: boolean;
  onAutoBalanceChange: (on: boolean) => void;
  countByRarity: Partial<Record<Rarity, number>>;
}) {
  const total = sumRates(rates);
  const ok = Math.abs(total - 100) < 0.001;
  const present = RARITY_LIST.filter((r) => (countByRarity[r] ?? 0) > 0);
  const actual = effectiveRates(rates, present, countByRarity);

  const set = (r: Rarity, raw: number) => {
    const value = roundRate(
      Math.min(100, Math.max(0, Number.isFinite(raw) ? raw : 0)),
    );
    const next = { ...rates, [r]: value };
    onChange(autoBalance ? rebalanceRates(next, r) : next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={autoBalance}
            onChange={(e) => onAutoBalanceChange(e.target.checked)}
            className="size-4 accent-[var(--color-red)]"
          />
          合計が 100% になるよう自動で調整
        </label>
        <span
          className={cn(
            "rounded-full border-2 px-2.5 py-0.5 font-mono text-sm font-medium",
            ok
              ? "border-ink bg-mint"
              : "border-red-deep bg-[#fff1ee] text-red-deep",
          )}
          aria-live="polite"
        >
          合計 {formatPercent(total)}
        </span>
      </div>
      <ul className="space-y-2">
        {RARITY_LIST.map((r) => {
          const count = countByRarity[r] ?? 0;
          const orphan = rates[r] > 0 && count === 0;
          return (
            <li
              key={r}
              className="grid grid-cols-[3rem_1fr_5.5rem] items-center gap-3 sm:grid-cols-[3rem_1fr_5.5rem_7rem]"
            >
              <RarityTag rarity={r} />
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={rates[r]}
                onChange={(e) => set(r, Number(e.target.value))}
                aria-label={`${r} の排出率`}
                className="w-full accent-[var(--color-ink)]"
              />
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={rates[r]}
                  onChange={(e) => set(r, e.target.valueAsNumber)}
                  aria-label={`${r} の排出率（数値）`}
                  className="h-9 w-full rounded-lg border-2 border-ink bg-card pr-6 pl-2 text-right font-mono text-base outline-none focus-visible:shadow-[0_0_0_3px_var(--color-mustard)]"
                />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-ink-3">
                  %
                </span>
              </div>
              <p className="col-span-3 -mt-1 text-xs text-ink-2 sm:col-span-1 sm:mt-0">
                {orphan ? (
                  <span className="inline-flex items-center gap-1 text-red-deep">
                    <AlertTriangle className="size-3.5" />
                    カード 0 種
                  </span>
                ) : (
                  <>
                    {count} 種
                    {count > 0 && actual[r] !== undefined && (
                      <span className="text-ink-3">
                        {" "}
                        ・ 実 {formatPercent(actual[r] ?? 0)}
                      </span>
                    )}
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
      {!ok && (
        <p role="alert" className="text-sm font-medium text-red-deep">
          合計を 100% にしてください（あと{" "}
          {formatPercent(roundRate(100 - total))}）
        </p>
      )}
      {RARITY_LIST.some((r) => rates[r] > 0 && !countByRarity[r]) && (
        <p className="text-xs text-ink-2">
          カードが入っていないレア度の枠は、入っているレア度に按分されます。「実」が実際の確率です。
        </p>
      )}
    </div>
  );
}
