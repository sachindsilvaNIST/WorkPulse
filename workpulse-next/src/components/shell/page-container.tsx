import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/** One shared page-width wrapper (G4) — every route under (app)/ used its own ad-hoc
 * `mx-auto max-w-*xl`, so each page's left edge landed at a different x-position depending on
 * which Tailwind max-width it happened to pick (max-w-6xl centered inside <main> lands somewhere
 * different than max-w-3xl centered in the same <main>). One container, one max-width, used by
 * every page, fixes that.
 *
 * `narrow` (About) caps the width for comfortable reading but is deliberately NOT centered — it
 * stays flush with the same left edge as every other page instead of drifting to its own more
 * centered position, per the brief's "must stay left-aligned... not centred" rule. */
export function PageContainer({
  children,
  narrow,
  className,
  ...rest
}: ComponentPropsWithoutRef<"div"> & { narrow?: boolean }) {
  return (
    <div className={cn("w-full", narrow ? "max-w-[880px]" : "mx-auto max-w-[1280px]", className)} {...rest}>
      {children}
    </div>
  );
}
