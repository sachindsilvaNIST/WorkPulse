"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/** Segmented tab bar: a glass pill with a raised selected segment (same look as SegmentedControl). */
export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("glass-sm inline-flex h-11 max-w-full flex-wrap items-center gap-0.5 rounded-pill p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "h-9 cursor-pointer rounded-pill px-3.5 text-[13px] font-medium text-text-body outline-none transition-[background-color,box-shadow] duration-[160ms] ease-glass hover:bg-fill-1 focus-visible:shadow-focus-ring data-[state=active]:bg-fill-raised data-[state=active]:font-semibold data-[state=active]:text-text-primary data-[state=active]:shadow-[0_1px_4px_rgba(30,41,59,0.14)] dark:data-[state=active]:shadow-none",
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
