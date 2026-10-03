import * as React from "react";
import { cn } from "@/lib/utils";

/** Presentational glass toast. Bottom-centre on phones, bottom-right from the lg breakpoint up. */
export function Toast({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "glass-sm fixed inset-x-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-inner px-4 py-3 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:left-auto",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {description && <p className="text-xs text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
