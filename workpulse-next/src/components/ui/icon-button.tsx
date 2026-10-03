import * as React from "react";
import { cn } from "@/lib/utils";

/** 44px circle, transparent until hovered. `aria-label` is required — icon-only buttons need a name. */
export function IconButton({
  className,
  "aria-label": ariaLabel,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-pill text-text-body transition-[background-color,transform] duration-[160ms] ease-glass outline-none hover:bg-fill-1 focus-visible:shadow-focus-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100 [&_svg]:size-[17px] [&_svg]:stroke-[1.9]",
        className
      )}
      {...props}
    />
  );
}
