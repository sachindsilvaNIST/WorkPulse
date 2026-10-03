"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFloatingPopover } from "@/lib/use-floating-popover";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toISODate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// All date math here is done in UTC (via Date.UTC / getUTC*) even though these are plain calendar
// dates with no real timezone — this only avoids the browser's local timezone ever shifting a
// parsed "YYYY-MM-DD" to the adjacent day, not a claim that the value itself is timezone-aware.
function parseISODate(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function formatDisplay(iso: string, compact: boolean): string {
  const parsed = parseISODate(iso);
  if (!parsed) return "";
  const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  return compact
    ? date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Apple Calendar-style month-grid picker — replaces native <input type="date">, whose rendered
 * placeholder/icon layout differs by browser and OS and doesn't fit cleanly at narrower widths. */
export function AppleDatePicker({
  value,
  onChange,
  className,
  placeholder = "Select date",
  size = "md",
}: {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** "sm" fits a dense table cell (matches this page's inputCls()); "md" (default) matches the
   * standalone form fields. */
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, popoverRef, rect } = useFloatingPopover(open, setOpen);
  const today = new Date();
  const parsedValue = value ? parseISODate(value) : null;
  const [viewYear, setViewYear] = useState(parsedValue?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedValue?.m ?? today.getMonth() + 1);

  useEffect(() => {
    function syncViewToValue() {
      if (!open) return;
      const p = value ? parseISODate(value) : null;
      setViewYear(p?.y ?? today.getFullYear());
      setViewMonth(p?.m ?? today.getMonth() + 1);
    }
    syncViewToValue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  const firstWeekday = new Date(Date.UTC(viewYear, viewMonth - 1, 1)).getUTCDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const prevMonthDays = daysInMonth(viewMonth === 1 ? viewYear - 1 : viewYear, viewMonth === 1 ? 12 : viewMonth - 1);

  const cells: { y: number; m: number; d: number; inMonth: boolean }[] = [];
  const prevM = viewMonth === 1 ? 12 : viewMonth - 1;
  const prevY = viewMonth === 1 ? viewYear - 1 : viewYear;
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ y: prevY, m: prevM, d: prevMonthDays - i, inMonth: false });
  }
  for (let d = 1; d <= totalDays; d++) cells.push({ y: viewYear, m: viewMonth, d, inMonth: true });
  const nextM = viewMonth === 12 ? 1 : viewMonth + 1;
  const nextY = viewMonth === 12 ? viewYear + 1 : viewYear;
  let nextDay = 1;
  while (cells.length < 42) cells.push({ y: nextY, m: nextM, d: nextDay++, inMonth: false });

  const todayISO = toISODate(today.getFullYear(), today.getMonth() + 1, today.getDate());

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
        <span className={cn("truncate", !value && "text-text-secondary")}>{value ? formatDisplay(value, size === "sm") : placeholder}</span>
        <Calendar className="size-3.5 shrink-0 text-text-secondary" />
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
            className="glass-panel fixed z-50 w-64 p-3"
            style={{ top: rect.bottom + 6, left: rect.left }}
          >
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => changeMonth(-1)} className="cursor-pointer rounded-full p-1 hover:bg-fill-1">
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs font-semibold">{MONTH_NAMES[viewMonth - 1]} {viewYear}</span>
              <button type="button" onClick={() => changeMonth(1)} className="cursor-pointer rounded-full p-1 hover:bg-fill-1">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-text-secondary">
              {WEEKDAYS.map((w, i) => (
                <div key={i} className="py-1">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((c, i) => {
                const iso = toISODate(c.y, c.m, c.d);
                const isSelected = iso === value;
                const isToday = iso === todayISO;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex size-8 cursor-pointer items-center justify-center rounded-full text-xs transition-colors hover:bg-fill-1",
                      !c.inMonth && "text-text-secondary/40",
                      isToday && !isSelected && "font-semibold text-primary",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {c.d}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between border-t border-separator pt-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => { onChange(""); setOpen(false); }}>
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onChange(todayISO);
                  setOpen(false);
                }}
              >
                Today
              </Button>
            </div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
