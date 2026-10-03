"use client";

import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = { value: T; label: string };

/** Glass pill with raised selected segment. Uses radio semantics so the selection is announced. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("glass-sm inline-flex h-11 items-center gap-0.5 rounded-pill p-1", className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-9 cursor-pointer rounded-pill px-3.5 text-[13px] transition-[background-color,box-shadow] duration-[160ms] ease-glass outline-none focus-visible:shadow-focus-ring",
              selected
                ? "bg-fill-raised font-semibold text-text-primary shadow-[0_1px_4px_rgba(30,41,59,0.14)] dark:shadow-none"
                : "font-medium text-text-body hover:bg-fill-1"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
