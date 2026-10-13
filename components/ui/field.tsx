import type * as React from "react";
import { cn } from "@/lib/utils";

// 文字は 16px 以上にする（iPhone は 16px 未満の入力欄にフォーカスすると画面を拡大し、そのまま戻らない）
const control =
  "w-full rounded-xl border-2 border-ink bg-card px-3.5 text-base text-ink placeholder:text-ink-3 outline-none transition-shadow focus-visible:shadow-[0_0_0_3px_var(--color-mustard)] focus-visible:outline-none disabled:opacity-50 aria-invalid:border-red-deep";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        control,
        "min-h-20 resize-y py-2.5 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return <select className={cn(control, "h-11 pr-8", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  counter,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  counter?: { value: number; max: number };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-bold">
          {label}
        </label>
        {counter && (
          <span
            className={cn(
              "font-mono text-xs",
              counter.value > counter.max ? "text-red-deep" : "text-ink-3",
            )}
          >
            {counter.value}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-deep">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-2">{hint}</p>
      ) : null}
    </div>
  );
}
