"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** The search bar pattern used throughout the app (Bookmarks, Resources, Contacts, ...) — a
 * leading Search icon plus, once there's text, a trailing clear button so the box doesn't have
 * to be cleared character-by-character or hunt for a separate reset. */
export function SearchInput({
  value,
  onValueChange,
  placeholder,
  className,
  inputClassName,
  small = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Extra classes for the underlying Input itself (e.g. a compact h-8/text-xs variant). */
  inputClassName?: string;
  /** Matches the slightly smaller icon size used on the Attendance/Dashboard search bar. */
  small?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", small ? "size-3.5" : "size-4")} />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(small ? "pl-8" : "pl-9", value && (small ? "pr-7" : "pr-9"), inputClassName)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
            small ? "right-2" : "right-3"
          )}
          title="Clear search"
        >
          <X className={small ? "size-3" : "size-4"} />
        </button>
      )}
    </div>
  );
}
