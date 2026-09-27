import { RARITY_META, type Rarity } from "@/lib/constants/rarity";
import { cn } from "@/lib/utils";

export const RARITY_BG: Record<Rarity, string> = {
  N: "bg-rarity-n",
  R: "bg-rarity-r",
  SR: "bg-rarity-sr",
  SSR: "bg-rarity-ssr",
  UR: "bg-rarity-ur",
};

export const RARITY_TEXT: Record<Rarity, string> = {
  N: "text-rarity-n",
  R: "text-rarity-r",
  SR: "text-rarity-sr",
  SSR: "text-rarity-ssr",
  UR: "text-rarity-ur",
};

export const RARITY_HEX: Record<Rarity, string> = {
  N: "#8c867e",
  R: "#2c9a66",
  SR: "#2f6fd0",
  SSR: "#8a4bd6",
  UR: "#d99a0b",
};

export function RarityTag({
  rarity,
  className,
  size = "md",
}: {
  rarity: Rarity;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      title={RARITY_META[rarity].name}
      className={cn(
        "inline-flex items-center justify-center rounded-md border-2 border-ink font-display leading-none text-white",
        size === "sm" && "h-5 min-w-7 px-1 text-[10px]",
        size === "md" && "h-6 min-w-9 px-1.5 text-xs",
        size === "lg" && "h-8 min-w-12 px-2 text-base",
        RARITY_BG[rarity],
        rarity === "UR" &&
          "bg-[linear-gradient(120deg,#f7c948,#ff8a5b,#c77dff,#4d96ff,#6bcb77,#f7c948)] bg-size-[200%_100%]",
        className,
      )}
    >
      {RARITY_META[rarity].label}
    </span>
  );
}
