"use client";

import { cn } from "@/lib/utils";

/** iOS proportions: 51×31 track, 27px thumb. Accent fill when on. */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-pill p-0.5 transition-colors duration-[240ms] ease-glass outline-none focus-visible:shadow-focus-ring disabled:cursor-default disabled:opacity-50",
        checked ? "bg-primary" : "bg-fill-2",
        className
      )}
    >
      <span
        className={cn(
          "inline-block size-[27px] rounded-pill bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-[240ms] ease-glass motion-reduce:transition-none",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}
