import * as React from "react";

import { cn } from "@/lib/utils";
import { GlassPanel, type GlassPanelSize } from "@/components/ui/glass-panel";

function Card({ className, size = "panel", ...props }: React.ComponentProps<"div"> & { size?: GlassPanelSize }) {
  return (
    <GlassPanel
      data-slot="card"
      size={size}
      className={cn("relative flex flex-col gap-4 text-text-primary", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-[17px] font-[650] leading-tight tracking-[-0.01em]", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-xs text-text-secondary", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
