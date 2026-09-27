"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** ポイント表示。値が変わると差分がふわっと浮かぶ。 */
export function PointsPill({
  points,
  className,
}: {
  points: number | undefined;
  className?: string;
}) {
  const prev = useRef(points);
  const [deltas, setDeltas] = useState<{ id: number; value: number }[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (points === undefined) return;
    const before = prev.current;
    prev.current = points;
    if (before === undefined || before === points) return;
    const id = nextId.current++;
    setDeltas((d) => [...d, { id, value: points - before }]);
    const timer = setTimeout(
      () => setDeltas((d) => d.filter((x) => x.id !== id)),
      900,
    );
    return () => clearTimeout(timer);
  }, [points]);

  return (
    <div
      className={cn(
        "relative inline-flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-mustard pr-3.5 pl-1.5 shadow-hard-sm",
        className,
      )}
      aria-live="polite"
    >
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-full border-2 border-ink bg-card font-display text-xs"
      >
        P
      </span>
      <span className="font-mono text-base font-medium tabular-nums">
        {points ?? "—"}
      </span>
      <span className="sr-only">ポイント</span>
      <span className="text-xs font-bold">pt</span>
      {deltas.map((d) => (
        <span
          key={d.id}
          aria-hidden
          className={cn(
            "pointer-events-none absolute -top-1 right-1 animate-float-up font-mono text-sm font-bold",
            d.value > 0 ? "text-rarity-r" : "text-red-deep",
          )}
        >
          {d.value > 0 ? `+${d.value}` : d.value}
        </span>
      ))}
    </div>
  );
}
