"use client";

import Image from "next/image";
import { CapsuleMark } from "@/components/shell/logo";
import { CARDS_PER_PULL, PACK_OPEN_COST } from "@/lib/constants/points";
import type { Rarity } from "@/lib/constants/rarity";
import { cn } from "@/lib/utils";
import { Capsule } from "./capsule";

export type MachinePhase = "idle" | "turning" | "capsule" | "opening";

// ドームの中のカプセル（固定配置にしてハイドレーションのズレを防ぐ）
const GLOBE_CAPSULES = [
  { x: 14, y: 58, r: -20, c: "var(--color-red)" },
  { x: 34, y: 66, r: 15, c: "var(--color-mustard)" },
  { x: 55, y: 62, r: -8, c: "#2f6fd0" },
  { x: 72, y: 54, r: 30, c: "var(--color-card)" },
  { x: 24, y: 40, r: 40, c: "#2c9a66" },
  { x: 46, y: 44, r: -30, c: "var(--color-red)" },
  { x: 64, y: 34, r: 10, c: "#8a4bd6" },
  { x: 36, y: 22, r: -12, c: "var(--color-card)" },
  { x: 16, y: 24, r: 22, c: "var(--color-mustard)" },
  { x: 54, y: 16, r: -40, c: "#2c9a66" },
];

export function GachaMachine({
  pack,
  phase,
  best,
  canAfford,
  onTurn,
  onOpenCapsule,
}: {
  pack: { name: string; thumbnailUrl: string | null } | null;
  phase: MachinePhase;
  best: Rarity | null;
  canAfford: boolean;
  onTurn: () => void;
  onOpenCapsule: () => void;
}) {
  const busy = phase !== "idle";
  const disabled = !pack || !canAfford || busy;

  return (
    <div className="mx-auto w-full max-w-[270px] select-none sm:max-w-[340px]">
      {/* ドーム */}
      <div
        className={cn(
          "relative mx-auto aspect-square w-[80%] overflow-hidden sm:w-[86%] rounded-full border-[3px] border-ink bg-[radial-gradient(circle_at_35%_30%,#fffdf8_0%,#eef3f4_45%,#dfe7ea_100%)]",
          phase === "turning" && "globe-shaking",
        )}
      >
        {GLOBE_CAPSULES.map((cap) => (
          <span
            key={`p-${cap.x}-${cap.y}`}
            className="absolute size-[22%]"
            style={{
              left: `${cap.x - 6}%`,
              top: `${cap.y - 2}%`,
              transform: `rotate(${cap.r}deg)`,
            }}
          >
            <CapsuleMark top={cap.c} className="size-full" />
          </span>
        ))}
        <div className="pointer-events-none absolute top-[8%] left-[14%] h-[30%] w-[18%] -rotate-30 rounded-full bg-white/70 blur-[1px]" />
      </div>

      {/* 首 */}
      <div className="mx-auto -mt-1 h-4 w-[46%] rounded-b-md border-x-[3px] border-b-[3px] border-ink bg-red-deep" />

      {/* 本体 */}
      <div className="relative -mt-0.5 rounded-[28px] border-[3px] border-ink bg-red px-4 pt-4 pb-5 shadow-hard-lg">
        <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-card p-2">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border-2 border-ink bg-paper-2">
            {pack?.thumbnailUrl ? (
              <Image
                src={pack.thumbnailUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <CapsuleMark className="absolute inset-0 m-auto size-7" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold leading-tight">
              {pack?.name ?? "パックを選んでね"}
            </p>
            <p className="text-xs text-ink-2">
              1 回 {PACK_OPEN_COST}pt ・ {CARDS_PER_PULL} 枚入り
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between">
          {/* 取り出し口 */}
          <div className="relative h-24 w-28 overflow-visible sm:w-32">
            <div className="absolute inset-x-0 bottom-0 h-20 rounded-2xl border-[3px] border-ink bg-ink/85 shadow-[inset_0_6px_0_rgba(0,0,0,.35)]" />
            <div className="absolute inset-x-0 bottom-0 flex h-20 items-center justify-center">
              {(phase === "capsule" || phase === "opening") && best && (
                <button
                  type="button"
                  onClick={onOpenCapsule}
                  disabled={phase === "opening"}
                  aria-label="カプセルを開ける"
                  className={cn(
                    "relative size-20 rounded-full focus-visible:outline-offset-4",
                    phase === "capsule" && "capsule-drop",
                  )}
                >
                  <Capsule
                    rarity={best}
                    opening={phase === "opening"}
                    className={cn(
                      "size-full",
                      phase === "capsule" && "capsule-idle",
                    )}
                  />
                </button>
              )}
            </div>
            <p className="absolute -top-1 left-0 w-full text-center text-[11px] font-bold tracking-widest text-white/90">
              {phase === "capsule" ? "タップで開ける!" : "とりだしぐち"}
            </p>
          </div>

          {/* ハンドル */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onTurn}
              disabled={disabled}
              aria-label={`ハンドルを回して引く（${PACK_OPEN_COST}pt）`}
              className={cn(
                "group relative grid size-20 place-items-center sm:size-24 rounded-full border-[3px] border-ink bg-card shadow-hard transition-transform",
                "enabled:hover:-rotate-12 enabled:active:scale-95 disabled:opacity-60",
              )}
            >
              <span
                className={cn(
                  "absolute inset-2 rounded-full border-2 border-ink/20",
                  phase === "turning" && "knob-turning",
                )}
              >
                <span className="absolute top-1/2 left-1/2 h-4 w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-mustard" />
                <span className="absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-red" />
              </span>
            </button>
            <span className="text-[11px] font-bold tracking-widest text-white/90">
              まわす
            </span>
          </div>
        </div>
      </div>
      <div className="mx-6 flex justify-between">
        <span className="h-3 w-10 rounded-b-lg border-x-[3px] border-b-[3px] border-ink bg-ink/80" />
        <span className="h-3 w-10 rounded-b-lg border-x-[3px] border-b-[3px] border-ink bg-ink/80" />
      </div>
    </div>
  );
}
