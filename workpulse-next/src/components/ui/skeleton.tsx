import { cn } from "@/lib/utils";

/** Placeholder block that shimmers unless reduced motion is set. Match `className`'s radius to what it replaces. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-inner bg-fill-1 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent motion-safe:before:animate-[shimmer_1.6s_infinite] dark:before:via-white/10",
        className
      )}
    />
  );
}
