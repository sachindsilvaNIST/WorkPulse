import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-pill bg-fill-1 px-4 text-[15px] text-text-primary outline-none transition-[background-color,box-shadow] duration-[160ms] ease-glass placeholder:text-text-secondary",
        "focus-visible:shadow-focus-ring focus-visible:bg-fill-raised",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:shadow-[0_0_0_2px_var(--status-danger-fg)]",
        className
      )}
      {...props}
    />
  );
}

export { Input };
