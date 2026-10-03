"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFloatingPopover } from "@/lib/use-floating-popover";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function ScrollColumn({ values, selected, onSelect, open }: { values: string[]; selected: string; onSelect: (v: string) => void; open: boolean }) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-value="${selected}"]`);
    el?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={listRef} className="h-40 w-14 overflow-y-auto rounded-lg border border-separator bg-background/30">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          data-value={v}
          onClick={() => onSelect(v)}
          className={cn(
            "flex h-8 w-full cursor-pointer items-center justify-center rounded-md text-xs tabular-nums hover:bg-fill-1",
            v === selected && "bg-primary/15 font-semibold text-primary"
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/** Apple-style two-column scrolling hour/minute picker — replaces native <input type="time">,
 * whose rendered sub-field layout differs by browser/OS and crowds a rounded-pill input. Portaled
 * to document.body (see useFloatingPopover) so it isn't clipped when used inside an
 * overflow-x-auto table. */
export function AppleTimePicker({
  value,
  onChange,
  className,
  size = "md",
}: {
  value: string; // "HH:mm" or ""
  onChange: (value: string) => void;
  className?: string;
  /** "sm" fits a dense table cell; "md" (default) matches the standalone form fields. */
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, popoverRef, rect } = useFloatingPopover(open, setOpen);
  const [hour, minute] = value ? value.split(":") : ["", ""];

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 border border-input bg-background/50 outline-none backdrop-blur-md transition-colors hover:bg-fill-1 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          size === "sm" ? "h-8 rounded-lg px-2 text-xs" : "h-9 rounded-full px-3.5 text-xs"
        )}
      >
        <span className={cn("truncate tabular-nums", !value && "text-text-secondary")}>{value || "--:--"}</span>
        <Clock className="size-3.5 shrink-0 text-text-secondary" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="glass-panel fixed z-50 w-max p-2"
              style={{ top: rect.bottom + 6, left: rect.left }}
            >
              <div className="flex items-center gap-1.5">
                <ScrollColumn values={HOURS} selected={hour} onSelect={(h) => onChange(`${h}:${minute || "00"}`)} open={open} />
                <span className="text-sm font-semibold text-text-secondary">:</span>
                <ScrollColumn values={MINUTES} selected={minute} onSelect={(m) => onChange(`${hour || "00"}:${m}`)} open={open} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
