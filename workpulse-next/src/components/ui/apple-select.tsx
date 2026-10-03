"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFloatingPopover } from "@/lib/use-floating-popover";

/** A fully custom dropdown — native <select> renders its trigger chevron and its option list with
 * the OS's own widget chrome, which varies by browser/platform and is why a manually-overlaid
 * chevron icon never lines up quite right against it. This owns both the trigger and the option
 * list end to end, so alignment and appearance are identical everywhere. Portaled to document.body
 * (see useFloatingPopover) so it isn't clipped when used inside an overflow-x-auto table. */
export function AppleSelect<T extends string>({
  value,
  onChange,
  options,
  disabled,
  className,
  title,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, popoverRef, rect } = useFloatingPopover(open, setOpen);
  const current = options.find((o) => o.value === value);

  return (
    <div className={className} title={disabled ? title : undefined}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-pill bg-fill-1 px-4 text-[15px] text-text-primary outline-none transition-[background-color,box-shadow] duration-[160ms] ease-glass",
          "hover:bg-fill-2 focus-visible:shadow-focus-ring",
          disabled && "cursor-not-allowed opacity-60 hover:bg-fill-1"
        )}
      >
        <span className="truncate">{current?.label ?? ""}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-text-secondary transition-transform", open && "rotate-180")} />
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
              className="glass fixed z-50 overflow-hidden rounded-inner p-1.5"
              style={{ top: rect.bottom + 6, left: rect.left, minWidth: rect.width }}
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-xs hover:bg-fill-1",
                    o.value === value && "font-medium text-primary"
                  )}
                >
                  {o.label}
                  {o.value === value && <Check className="size-3.5 shrink-0" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
