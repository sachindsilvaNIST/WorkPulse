import * as React from "react";
import { cn } from "@/lib/utils";

const SIZE = {
  panel: "rounded-panel p-5",
  tile: "rounded-tile p-[18px]",
  inner: "rounded-inner p-4",
} as const;

export type GlassPanelSize = keyof typeof SIZE;

type GlassPanelProps = React.HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article" | "aside";
  size?: GlassPanelSize;
};

/** Top-level glass surface. Use `size="inner"` only for nested content that doesn't itself sit on glass. */
export function GlassPanel({ as = "div", size = "panel", className, ...props }: GlassPanelProps) {
  const Comp = as as "div";
  return <Comp data-slot="glass-panel" className={cn("glass", SIZE[size], className)} {...props} />;
}
