import * as React from "react";
import { cn } from "@/lib/utils";

/** Floating glass pill grouping icon buttons or a short text control (e.g. a month stepper). */
export function ToolbarCapsule({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      className={cn("glass-sm inline-flex h-11 items-center gap-0.5 rounded-pill px-1", className)}
      {...props}
    />
  );
}
