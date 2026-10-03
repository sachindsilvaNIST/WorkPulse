import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-pill text-sm font-semibold tracking-normal transition-[background-color,box-shadow,transform,opacity] duration-[160ms] ease-glass cursor-pointer select-none outline-none focus-visible:shadow-focus-ring active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35),var(--accent-glow)] hover:brightness-110",
        primary:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35),var(--accent-glow)] hover:brightness-110",
        glass:
          "bg-fill-glass-button text-text-primary border border-glass-border shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] font-medium hover:bg-fill-raised",
        outline:
          "bg-fill-glass-button text-text-primary border border-glass-border font-medium hover:bg-fill-raised",
        secondary: "bg-fill-1 text-text-primary font-medium hover:bg-fill-2",
        ghost: "text-text-body font-medium hover:bg-fill-1",
        destructive:
          "bg-status-danger-bg text-status-danger-fg font-semibold hover:bg-status-danger-bg",
        link: "text-link underline-offset-4 hover:underline rounded-none px-0 h-auto",
      },
      size: {
        default: "h-11 px-5 text-[15px]",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-6 text-base",
        icon: "size-11 rounded-full p-0 [&_svg:not([class*='size-'])]:size-[17px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
