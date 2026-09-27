"use client";

import { useCallback, useRef } from "react";

/**
 * ポインタ位置に合わせてカードを傾け、ホログラムの光源を動かす。
 * CSS 変数だけを書き換えるので再レンダリングは起きない。
 */
export function useTilt<T extends HTMLElement>(maxDeg = 10) {
  const ref = useRef<T>(null);
  const frame = useRef(0);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<T>) => {
      const el = ref.current;
      if (!el || e.pointerType === "touch") return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.dataset.tilting = "true";
        el.style.setProperty("--tilt-x", `${(0.5 - py) * maxDeg}deg`);
        el.style.setProperty("--tilt-y", `${(px - 0.5) * maxDeg}deg`);
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
      });
    },
    [maxDeg],
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.dataset.tilting = "false";
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
