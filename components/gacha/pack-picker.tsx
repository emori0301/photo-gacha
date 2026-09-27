"use client";

import { Check, ChevronDown } from "lucide-react";
import Image from "next/image";
import { RarityTag } from "@/components/cards/rarity";
import { CapsuleMark } from "@/components/shell/logo";
import { RARITY_LIST, type Rarity } from "@/lib/constants/rarity";
import { cn, formatPercent } from "@/lib/utils";

export type PackSummary = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  cardCount: number;
  ownedCount: number;
  countByRarity: Partial<Record<Rarity, number>>;
  odds: Partial<Record<Rarity, number>>;
  isMine: boolean;
  creatorName: string | null;
};

export function PackPicker({
  packs,
  selectedId,
  onSelect,
  disabled,
}: {
  packs: PackSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <ul aria-label="パック一覧" className="space-y-3">
      {packs.map((pack) => {
        const active = pack.id === selectedId;
        const complete = pack.ownedCount >= pack.cardCount;
        const progress = pack.cardCount
          ? (pack.ownedCount / pack.cardCount) * 100
          : 0;
        return (
          <li
            key={pack.id}
            className={cn(
              "rounded-2xl border-2 border-ink bg-card transition-[box-shadow,transform]",
              active
                ? "shadow-hard ring-4 ring-mustard"
                : "hover:-translate-y-0.5 hover:shadow-hard-sm",
            )}
          >
            <button
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onSelect(pack.id)}
              className="flex w-full items-center gap-3 p-3 text-left disabled:cursor-not-allowed"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border-2 border-ink bg-paper-2">
                {pack.thumbnailUrl ? (
                  <Image
                    src={pack.thumbnailUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <CapsuleMark className="absolute inset-0 m-auto size-9" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-bold">{pack.name}</p>
                  {complete && (
                    <span className="shrink-0 rounded-md border-2 border-ink bg-mustard px-1 font-display text-[10px] leading-4">
                      COMP
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-ink-2">
                  {pack.isMine
                    ? "あなたのパック"
                    : pack.creatorName
                      ? `by ${pack.creatorName}`
                      : "作者不明"}
                  {" ・ "}全 {pack.cardCount} 種
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full border border-ink bg-paper-2">
                    <div
                      className="h-full bg-rarity-r transition-[width] duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-ink-2 tabular-nums">
                    {pack.ownedCount}/{pack.cardCount}
                  </span>
                </div>
              </div>
              <span
                aria-hidden
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink",
                  active ? "bg-ink text-paper" : "bg-card",
                )}
              >
                {active && <Check className="size-3.5" strokeWidth={3} />}
              </span>
            </button>
            <details className="group border-t-2 border-dashed border-line px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-bold text-ink-2 [&::-webkit-details-marker]:hidden">
                提供割合
                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-2 grid grid-cols-5 gap-1.5 pb-1">
                {RARITY_LIST.map((r) => (
                  <li key={r} className="flex flex-col items-center gap-1">
                    <RarityTag rarity={r} size="sm" />
                    <span
                      className={cn(
                        "font-mono text-[11px] tabular-nums",
                        !pack.odds[r] && "text-ink-3",
                      )}
                    >
                      {pack.odds[r] ? formatPercent(pack.odds[r]) : "—"}
                    </span>
                    <span className="text-[10px] text-ink-3">
                      {pack.countByRarity[r] ?? 0}種
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
