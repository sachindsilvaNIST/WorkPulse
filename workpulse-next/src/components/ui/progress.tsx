import { cn } from "@/lib/utils";

/** 6px pill progress bar. `value` is 0–1. */
export function ProgressBar({ value, className, label }: { value: number; className?: string; label?: string }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-pill bg-fill-2", className)}
    >
      <div className="h-full rounded-pill bg-primary transition-[width] duration-[240ms] ease-glass" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 132px ring; starts at 12 o'clock with round caps. `value` is 0–1. */
export function ProgressRing({
  value,
  caption,
  center,
  label,
}: {
  value: number;
  caption?: string;
  center: string;
  label?: string;
}) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div role="img" aria-label={label ?? `${Math.round(pct * 100)}%`} className="relative inline-flex size-[132px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 132 132" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--fill-2)" strokeWidth={12} />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-[240ms] ease-glass motion-reduce:transition-none"
        />
      </svg>
      <div className="relative text-center">
        <p className="text-2xl font-bold tabular-nums tracking-[-0.03em] text-text-primary">{center}</p>
        {caption && <p className="text-xs text-text-secondary">{caption}</p>}
      </div>
    </div>
  );
}
