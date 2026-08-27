import { cn } from "@/lib/utils";

const BAR_COUNT = 8;

/** Apple/iOS-style activity indicator — 8 bars radiating from center, each fading in sequence
 * around the circle (the bars themselves never rotate). Color follows `currentColor`, so wrap it
 * in a text-color class to theme it; size is driven by the `size` prop, matching Lucide icons'
 * convention so it drops into the same spots a `<Loader2 className="animate-spin" />` used to. */
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  const barWidth = Math.max(1.5, size * 0.09);
  const barHeight = size * 0.28;
  const radius = size * 0.36;

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const angle = (360 / BAR_COUNT) * i;
        const delay = -(1 - i / BAR_COUNT);
        return (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full bg-current"
            style={{
              width: barWidth,
              height: barHeight,
              marginLeft: -barWidth / 2,
              marginTop: -barHeight / 2,
              transform: `rotate(${angle}deg) translateY(-${radius}px)`,
              transformOrigin: "center",
              animation: "apple-spinner-fade 1s linear infinite",
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </span>
  );
}
