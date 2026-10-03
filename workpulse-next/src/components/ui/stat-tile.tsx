import * as React from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

/** Dashboard metric tile: label + icon tile on top, big tabular value, caption underneath. */
export function StatTile({
  label,
  value,
  unit,
  caption,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  caption?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <GlassPanel size="tile" className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-text-secondary">{label}</p>
        {Icon && (
          <span className="flex size-[30px] items-center justify-center rounded-icon bg-fill-raised text-text-primary shadow-[var(--fill-raised-shadow)]">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="flex items-baseline gap-1.5 tabular-nums">
        <span className="text-[30px] font-bold leading-none tracking-[-0.03em] text-text-primary">{value}</span>
        {unit && <span className="text-sm text-text-secondary">{unit}</span>}
      </p>
      {caption && <p className="text-xs text-text-secondary">{caption}</p>}
    </GlassPanel>
  );
}
