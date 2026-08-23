"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<typeof Input>;

/** Text input with a suggestions dropdown drawn from values the user has previously entered into
 * this same field elsewhere (e.g. every Department a contact has ever had). Callers own the value
 * — this component doesn't persist anything itself, it just filters and renders `suggestions`. */
export function AutocompleteInput({
  value,
  onValueChange,
  suggestions,
  onKeyDown,
  className,
  ...props
}: Omit<InputProps, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = value.trim().toLowerCase();
  const filtered = trimmed
    ? suggestions.filter((s) => s.toLowerCase().includes(trimmed) && s.toLowerCase() !== trimmed).slice(0, 8)
    : suggestions.slice(0, 8);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function selectSuggestion(s: string) {
    onValueChange(s);
    setOpen(false);
    setHighlighted(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Let field-specific handlers (numeric filtering, email charset, shake-on-reject) run first —
    // they may call preventDefault() on the keystroke, which arrow/enter navigation shouldn't
    // then also react to.
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      selectSuggestion(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        {...props}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
          setHighlighted(-1);
        }}
        onFocus={(e) => {
          props.onFocus?.(e);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={className}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="glass-panel absolute z-40 mt-1 max-h-48 w-full overflow-auto p-1">
          {filtered.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
              className={cn(
                "block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm text-foreground hover:bg-foreground/10",
                i === highlighted && "bg-foreground/10"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
