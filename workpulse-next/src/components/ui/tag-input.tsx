"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Free-form multi-value chip entry — type + Enter/comma to add, Backspace on an empty field
 * removes the last chip, with an autocomplete dropdown drawn from `suggestions` (typically every
 * tag already used elsewhere, same "suggestions come from sibling data" trick as
 * AutocompleteInput). Callers own the value; this component doesn't persist anything itself. */
export function TagInput({
  value,
  onValueChange,
  suggestions,
  placeholder,
  className,
}: {
  value: string[];
  onValueChange: (value: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const trimmedDraft = draft.trim().toLowerCase();
  const filtered = suggestions.filter(
    (s) => !value.includes(s) && (trimmedDraft ? s.toLowerCase().includes(trimmedDraft) : true)
  ).slice(0, 8);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) return;
    onValueChange([...value, tag]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onValueChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-2xl border border-input bg-background/50 px-3 py-1.5 backdrop-blur-md">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-foreground/8 px-2 py-0.5 text-xs font-medium">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="cursor-pointer text-muted-foreground hover:text-foreground">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : undefined}
          className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="glass-panel absolute z-40 mt-1 max-h-48 w-full overflow-auto p-1">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              className="block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm text-foreground hover:bg-foreground/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
