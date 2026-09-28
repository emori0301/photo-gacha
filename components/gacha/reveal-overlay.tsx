"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CardBack,
  CountBadge,
  NewBadge,
  PhotoCard,
} from "@/components/cards/photo-card";
import { RARITY_HEX, RARITY_TEXT } from "@/components/cards/rarity";
import { Button } from "@/components/ui/button";
import { PACK_OPEN_COST } from "@/lib/constants/points";
import { RARITY_META, type Rarity } from "@/lib/constants/rarity";
import { cn } from "@/lib/utils";

export type RevealCard = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  rarity: Rarity;
  creatorName: string | null;
  isNew: boolean;
  owned: number;
};

const CONFETTI = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2;
  const dist = 140 + ((i * 37) % 90);
  return {
    dx: `${Math.round(Math.cos(angle) * dist)}px`,
    dy: `${Math.round(Math.sin(angle) * dist)}px`,
    rot: `${(i * 67) % 360}deg`,
    color: ["#e0402a", "#f2b52c", "#2f6fd0", "#2c9a66", "#8a4bd6"][i % 5],
    delay: `${(i % 4) * 40}ms`,
    shape: i % 3 === 0 ? "rounded-full" : "rounded-[2px]",
  };
});

function isShiny(r: Rarity) {
  return r === "SR" || r === "SSR" || r === "UR";
}

export function RevealOverlay({
  open,
  packName,
  cards,
  points,
  onClose,
  onAgain,
}: {
  open: boolean;
  packName: string;
  cards: RevealCard[];
  points: number;
  onClose: () => void;
  onAgain: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [summary, setSummary] = useState(false);
  const mainButton = useRef<HTMLButtonElement>(null);

  // 新しい結果が来たら最初から
  useEffect(() => {
    if (open) {
      setIndex(0);
      setFlipped(false);
      setSummary(false);
    }
  }, [open]);

  const current = cards[index];
  const isLast = index === cards.length - 1;

  const advance = useCallback(() => {
    if (summary) return;
    if (!flipped) {
      setFlipped(true);
    } else if (isLast) {
      setSummary(true);
    } else {
      setFlipped(false);
      setIndex((i) => i + 1);
    }
  }, [summary, flipped, isLast]);

  const canAgain = points >= PACK_OPEN_COST;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#171412]/97 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] text-paper outline-none"
          // 開いたら「めくる」ボタンにフォーカスし、スペース/Enter でめくれるようにする
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            mainButton.current?.focus();
          }}
          onKeyDown={(e) => {
            if (summary) return;
            const onButton = (e.target as HTMLElement).tagName === "BUTTON";
            // ボタン上のスペース/Enter はボタン自身の動作に任せる
            if (
              e.key === "ArrowRight" ||
              (!onButton && (e.key === " " || e.key === "Enter"))
            ) {
              e.preventDefault();
              advance();
            }
          }}
        >
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate font-display text-lg">
                {packName}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                カードを 1 枚ずつめくって結果を確認します
              </DialogPrimitive.Description>
              {!summary && (
                <ol
                  className="mt-1.5 flex gap-1.5"
                  aria-label={`${index + 1} / ${cards.length} 枚目`}
                >
                  {cards.map((c, i) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: 同じカードが複数出るため位置で識別する
                      key={i}
                      className={cn(
                        "h-2 w-6 rounded-full border border-paper/60",
                        i < index || (i === index && flipped)
                          ? ""
                          : "bg-transparent",
                      )}
                      style={
                        i < index || (i === index && flipped)
                          ? { backgroundColor: RARITY_HEX[c.rarity] }
                          : undefined
                      }
                    />
                  ))}
                </ol>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!summary && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-paper hover:bg-paper/10"
                  onClick={() => setSummary(true)}
                >
                  全部めくる
                </Button>
              )}
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-paper hover:bg-paper/10"
                  aria-label="閉じる"
                >
                  <X />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {!summary && current ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 pb-8">
              <div className="relative w-[min(64vw,290px,calc((100dvh-250px)*0.68))]">
                {/* レア度演出 */}
                {flipped && isShiny(current.rarity) && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                  >
                    <div
                      className="rays absolute top-1/2 left-1/2 size-[190%] rounded-full opacity-60"
                      style={{
                        background: `repeating-conic-gradient(${RARITY_HEX[current.rarity]} 0deg 10deg, transparent 10deg 24deg)`,
                        maskImage:
                          "radial-gradient(circle, #000 20%, transparent 68%)",
                      }}
                    />
                    <div
                      key={`burst-${index}`}
                      className="burst absolute top-1/2 left-1/2 size-[140%] rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${RARITY_HEX[current.rarity]}, transparent 65%)`,
                      }}
                    />
                  </div>
                )}
                {flipped && current.rarity === "UR" && (
                  <div
                    aria-hidden
                    key={`confetti-${index}`}
                    className="pointer-events-none absolute top-1/2 left-1/2"
                  >
                    {CONFETTI.map((p) => (
                      <span
                        key={`${p.dx}-${p.dy}`}
                        className={cn(
                          "confetti-piece absolute size-2.5",
                          p.shape,
                        )}
                        style={
                          {
                            backgroundColor: p.color,
                            animationDelay: p.delay,
                            "--dx": p.dx,
                            "--dy": p.dy,
                            "--rot": p.rot,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  key={index}
                  onClick={advance}
                  aria-label={flipped ? "次へ" : "カードをめくる"}
                  className="flip-scene relative block w-full animate-rise text-ink"
                >
                  <div className="flip-inner relative" data-flipped={flipped}>
                    <div className="flip-face flip-front">
                      <PhotoCard
                        card={current}
                        size="lg"
                        tilt={flipped}
                        priority
                        sizes="300px"
                        badge={
                          current.isNew ? (
                            <NewBadge />
                          ) : (
                            <CountBadge count={current.owned} />
                          )
                        }
                      />
                    </div>
                    <div className="flip-face absolute inset-0">
                      <CardBack />
                    </div>
                  </div>
                </button>
              </div>

              <div className="h-14 text-center" aria-live="polite">
                {flipped && (
                  <div className="animate-rise">
                    <p
                      className={cn(
                        "font-display text-2xl",
                        RARITY_TEXT[current.rarity],
                        current.rarity === "N" && "text-paper/80",
                      )}
                    >
                      {RARITY_META[current.rarity].name}
                      {current.rarity === "UR" && "!!"}
                    </p>
                    <p className="text-sm text-paper/70">
                      {current.creatorName
                        ? `by ${current.creatorName}`
                        : "作者不明"}
                      {current.isNew
                        ? " ・ はじめて入手"
                        : ` ・ ${current.owned} 枚目`}
                    </p>
                  </div>
                )}
              </div>

              <Button
                ref={mainButton}
                variant="yellow"
                size="lg"
                onClick={advance}
                className="min-w-48"
              >
                {!flipped ? "めくる" : isLast ? "結果を見る" : "つぎのカード"}
              </Button>
              <p className="hidden text-xs text-paper/50 sm:block">
                スペース・Enter・→ キーでもめくれます
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
              <div className="mx-auto max-w-4xl">
                <p className="mb-5 text-center font-display text-3xl">
                  今回の結果
                </p>
                <ul className="grid grid-cols-2 gap-4 text-ink sm:grid-cols-3 md:grid-cols-5">
                  {cards.map((card, i) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: 同じカードが複数出るため位置で識別する
                      key={i}
                      className="animate-rise"
                      style={{
                        animationDelay: `${i * 60}ms`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <PhotoCard
                        card={card}
                        sizes="(min-width: 768px) 180px, 45vw"
                        badge={
                          card.isNew ? (
                            <NewBadge />
                          ) : (
                            <CountBadge count={card.owned} />
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button size="lg" onClick={onAgain} disabled={!canAgain}>
                    <RotateCcw />
                    もう一回（{PACK_OPEN_COST}pt）
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href="/collection" onClick={onClose}>
                      図鑑を見る
                    </Link>
                  </Button>
                </div>
                <p className="mt-3 text-center text-sm text-paper/70">
                  残り {points}pt
                  {!canAgain && (
                    <>
                      {" ・ "}
                      <Link
                        href="/earn"
                        onClick={onClose}
                        className="underline underline-offset-4"
                      >
                        ポイントを貯める
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
