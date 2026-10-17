import * as React from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

/** Centred empty state inside a glass panel. `variant="error"` is the same layout with a
 * danger-tinted icon (G9) — used when a fetch failed rather than when a list is genuinely empty.
 * The two are mutually exclusive by construction (callers render one or the other, never both). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: "default" | "error";
}) {
  return (
    <GlassPanel className={cn("flex flex-col items-center gap-3 py-10 text-center", className)}>
      {Icon && (
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-pill",
            variant === "error" ? "bg-status-danger-bg text-status-danger-fg" : "bg-fill-1 text-text-secondary"
          )}
        >
          <Icon className="size-[22px]" />
        </span>
      )}
      <p className="text-[17px] font-[650] tracking-[-0.01em] text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-secondary">{description}</p>}
      {action}
    </GlassPanel>
  );
}
