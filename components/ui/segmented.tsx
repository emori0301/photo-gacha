"use client";

import type * as React from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/** ラジオボタン相当の選択 UI（矢印キーで移動できる） */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; className?: string }[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const group = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => {
    const i = options.findIndex((o) => o.value === value);
    const nextIndex = (i + dir + options.length) % options.length;
    onChange(options[nextIndex].value);
    // 選択と一緒にフォーカスも移す（roving tabindex）
    group.current
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [nextIndex]?.focus();
  };
  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-full border-2 border-ink bg-card p-1",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: 見た目を自由にするため button に radio ロールを付けている
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full font-bold transition-colors",
              size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-4 text-sm",
              active ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
              active && o.className,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
