"use client";

import { cn } from "@/lib/utils";

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
        "relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50",
        checked ? "bg-[#34C759]" : "bg-input",
        className
      )}
    >
      <span
        className={cn(
          "inline-block size-[22px] translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200",
          checked && "translate-x-[21px]"
        )}
      />
    </button>
  );
}
