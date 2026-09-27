import type * as React from "react";
import { CapsuleMark } from "@/components/shell/logo";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl border-2 border-dashed border-ink/40 bg-card/60 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="relative mb-4 h-12 w-20">
        <CapsuleMark
          className="absolute top-2 left-0 size-9 -rotate-12"
          top="var(--color-mustard)"
        />
        <CapsuleMark className="absolute top-0 right-0 size-10 rotate-12" />
      </div>
      <p className="font-display text-lg">{title}</p>
      {children && (
        <div className="mt-2 max-w-sm text-sm text-ink-2">{children}</div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageTitle({
  title,
  lead,
  action,
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">
          {title}
        </h1>
        {lead && <p className="mt-1.5 text-ink-2">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-2xl border-2 border-ink/15 bg-paper-2",
        className,
      )}
    />
  );
}
