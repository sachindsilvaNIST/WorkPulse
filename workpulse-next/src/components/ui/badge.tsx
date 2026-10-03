import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-[3px] text-xs font-semibold w-fit shrink-0 tabular-nums",
  {
    variants: {
      variant: {
        success: "bg-status-success-bg text-status-success-fg",
        warning: "bg-status-warning-bg text-status-warning-fg",
        neutral: "bg-status-neutral-bg text-status-neutral-fg",
        info: "bg-status-info-bg text-status-info-fg",
        danger: "bg-status-danger-bg text-status-danger-fg",
        // Legacy names kept so existing call sites map onto the status palette.
        default: "bg-status-info-bg text-status-info-fg",
        secondary: "bg-status-neutral-bg text-status-neutral-fg",
        destructive: "bg-status-danger-bg text-status-danger-fg",
        outline: "border border-separator text-text-body bg-transparent",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

/** Live "in progress" dot — pair with the `info` variant so status is never colour alone. */
function StatusDot() {
  return (
    <span
      aria-hidden
      className="size-1.5 rounded-full bg-current motion-safe:animate-pulse"
    />
  );
}

function Badge({
  className,
  variant,
  asChild = false,
  dot = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean; dot?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <StatusDot />}
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
export { Badge as StatusBadge };
