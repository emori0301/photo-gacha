import { cn } from "@/lib/utils";

export function CapsuleMark({
  className,
  top = "var(--color-red)",
}: {
  className?: string;
  top?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <path d="M3 16a13 13 0 0 1 26 0Z" fill={top} />
      <path d="M3 16h26a13 13 0 0 1-26 0Z" fill="var(--color-card)" />
      <circle
        cx="16"
        cy="16"
        r="13"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
      />
      <path d="M3 16h26" stroke="var(--color-ink)" strokeWidth="2.5" />
      <path
        d="M9.5 10.5a8 8 0 0 1 5-3.5"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity=".8"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CapsuleMark className="size-7 sm:size-8" />
      <span className="font-display text-lg tracking-wide sm:text-xl">
        PhotoGacha
      </span>
    </span>
  );
}
