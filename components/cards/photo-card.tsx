"use client";

import Image from "next/image";
import type * as React from "react";
import { useTilt } from "@/hooks/use-tilt";
import type { Rarity } from "@/lib/constants/rarity";
import { cn } from "@/lib/utils";
import { RarityTag } from "./rarity";

export type CardData = {
  name: string;
  imageUrl: string;
  rarity: Rarity;
};

const FRAME: Record<Rarity, string> = {
  N: "bg-card",
  R: "bg-card",
  SR: "bg-[#eef4ff]",
  SSR: "bg-[#f5eeff]",
  UR: "bg-[linear-gradient(135deg,#fff3c4,#ffe08a_40%,#fff6d8_60%,#f5c945)]",
};

/**
 * インスタント写真風のカード。
 * size で文字サイズを調整し、幅は親要素に合わせる。
 */
export function PhotoCard({
  card,
  size = "md",
  tilt = true,
  badge,
  footer,
  sizes = "(min-width: 1024px) 200px, 45vw",
  priority,
  className,
  unoptimized,
}: {
  card: CardData;
  size?: "sm" | "md" | "lg";
  tilt?: boolean;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  sizes?: string;
  priority?: boolean;
  className?: string;
  unoptimized?: boolean;
}) {
  const t = useTilt<HTMLDivElement>(size === "lg" ? 12 : 9);
  const shiny = card.rarity !== "N" && card.rarity !== "R";
  return (
    <div
      ref={t.ref}
      onPointerMove={tilt ? t.onPointerMove : undefined}
      onPointerLeave={tilt ? t.onPointerLeave : undefined}
      className={cn(
        "photo-card relative flex w-full flex-col rounded-2xl border-2 border-ink shadow-hard",
        size === "lg"
          ? "p-3 pb-4"
          : size === "md"
            ? "p-2 pb-2.5"
            : "p-1.5 pb-2",
        FRAME[card.rarity],
        className,
      )}
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-[10px] border-2 border-ink bg-paper-2">
        <Image
          src={card.imageUrl}
          alt={card.name}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={unoptimized}
          className="object-cover"
          draggable={false}
        />
        {shiny && <div className="foil" data-rarity={card.rarity} />}
        <RarityTag
          rarity={card.rarity}
          size={size === "lg" ? "lg" : size === "md" ? "md" : "sm"}
          className="absolute top-1.5 left-1.5"
        />
        {badge && <div className="absolute top-1.5 right-1.5">{badge}</div>}
      </div>
      <p
        className={cn(
          "mt-2 truncate px-0.5 font-bold",
          size === "lg" ? "text-lg" : size === "md" ? "text-sm" : "text-xs",
        )}
        title={card.name}
      >
        {card.name}
      </p>
      {footer}
    </div>
  );
}

export function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "card-back relative flex h-full w-full items-center justify-center rounded-2xl border-2 border-ink shadow-hard",
        className,
      )}
    >
      <span className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-display text-sm tracking-wider">
        PhotoGacha
      </span>
    </div>
  );
}

export function CountBadge({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <span className="inline-flex h-6 items-center rounded-md border-2 border-ink bg-card px-1.5 font-mono text-xs font-bold">
      ×{count}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex h-6 animate-pop items-center rounded-md border-2 border-ink bg-mustard px-1.5 font-display text-[11px] leading-none">
      NEW
    </span>
  );
}
