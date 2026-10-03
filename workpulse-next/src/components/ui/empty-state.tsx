import * as React from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

/** Centred empty state inside a glass panel. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel className={cn("flex flex-col items-center gap-3 py-10 text-center", className)}>
      {Icon && (
        <span className="flex size-11 items-center justify-center rounded-pill bg-fill-1 text-text-secondary">
          <Icon className="size-[22px]" />
        </span>
      )}
      <p className="text-[17px] font-[650] tracking-[-0.01em] text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-secondary">{description}</p>}
      {action}
    </GlassPanel>
  );
}
