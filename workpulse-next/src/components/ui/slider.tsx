"use client";

import { cn } from "@/lib/utils";

/** Native range input styled as an iOS slider. 28px hit area; accent fill on the track. */
export function Slider({
  value,
  onChange,
  onCommit,
  min = 0,
  max = 100,
  step = 1,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  className?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerUp={(e) => onCommit?.(Number(e.currentTarget.value))}
      onKeyUp={(e) => onCommit?.(Number(e.currentTarget.value))}
      className={cn(
        "h-7 w-full cursor-pointer appearance-none bg-transparent outline-none focus-visible:shadow-focus-ring [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-pill [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--accent)_var(--pct),var(--fill-2)_var(--pct))] [&::-webkit-slider-thumb]:-mt-[11px] [&::-webkit-slider-thumb]:size-[28px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-pill [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.25)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-pill [&::-moz-range-track]:bg-fill-2 [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-pill [&::-moz-range-progress]:bg-primary [&::-moz-range-thumb]:size-[28px] [&::-moz-range-thumb]:rounded-pill [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white",
        className
      )}
      style={{ ["--pct" as string]: `${pct}%` }}
    />
  );
}
