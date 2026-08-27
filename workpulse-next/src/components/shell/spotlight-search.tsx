"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Library, Search, type LucideIcon } from "lucide-react";
import { useSpotlight } from "@/lib/spotlight-context";
import { NAV_ITEMS, resolveNavColor } from "@/lib/nav-items";
import { resourcesApi, quickLinksApi } from "@/lib/api/client";
import type { Resource, QuickLink } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface SpotlightResult {
  id: string;
  group: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  color: string;
  action: () => void;
}

/** App-wide quick search — Cmd/Ctrl+K from anywhere, or the search bar on Home. Searches nav
 * sections plus your own saved Resources and Bookmarks by keyword, so "taiwan" jumps straight to
 * the visa guide instead of making you go find the right section first. */
export function SpotlightSearch() {
  const { open, setOpen } = useSpotlight();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [bookmarks, setBookmarks] = useState<QuickLink[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K opens from anywhere; Escape closes. A second Cmd/Ctrl+K while open just refocuses
  // rather than toggling closed, matching how Spotlight itself behaves.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlighted(0);
      return;
    }
    inputRef.current?.focus();
    if (resources === null) resourcesApi.getAll().then(setResources).catch(() => setResources([]));
    if (bookmarks === null) quickLinksApi.getAll().then(setBookmarks).catch(() => setBookmarks([]));
  }, [open, resources, bookmarks]);

  const results = useMemo<SpotlightResult[]>(() => {
    const q = query.trim().toLowerCase();

    const navResults: SpotlightResult[] = NAV_ITEMS.filter((item) => !item.disabled)
      .filter((item) => !q || `${item.label} ${item.description}`.toLowerCase().includes(q))
      .map((item) => ({
        id: `nav-${item.href}`,
        group: "Go to",
        label: item.label,
        description: item.description,
        icon: item.icon,
        color: resolveNavColor(item.color),
        action: () => router.push(item.href),
      }));

    const resourceResults: SpotlightResult[] = q
      ? (resources ?? [])
          .filter((r) => `${r.title} ${r.notes} ${r.tags} ${r.keywords}`.toLowerCase().includes(q))
          .slice(0, 5)
          .map((r) => ({
            id: `resource-${r.id}`,
            group: "Resources",
            label: r.title,
            description: r.tags || r.notes,
            icon: Library,
            color: "#5AC8FA",
            action: () => router.push(`/resources?q=${encodeURIComponent(r.title)}`),
          }))
      : [];

    const bookmarkResults: SpotlightResult[] = q
      ? (bookmarks ?? [])
          .filter((b) => `${b.label} ${b.category} ${b.keywords}`.toLowerCase().includes(q))
          .slice(0, 5)
          .map((b) => ({
            id: `bookmark-${b.id}`,
            group: "Bookmarks",
            label: b.label,
            description: b.category || b.url,
            icon: Bookmark,
            color: "#00C7BE",
            action: () => router.push(`/bookmarks?q=${encodeURIComponent(b.label)}`),
          }))
      : [];

    return [...navResults, ...resourceResults, ...bookmarkResults];
  }, [query, resources, bookmarks, router]);

  const groups = Array.from(new Set(results.map((r) => r.group)));

  useEffect(() => setHighlighted(0), [query]);

  function select(result: SpotlightResult) {
    result.action();
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && results[highlighted]) {
      e.preventDefault();
      select(results[highlighted]);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel w-full max-w-lg overflow-hidden"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="size-4.5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search WorkPulse — sections, resources, bookmarks…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches.</p>}
              {groups.map((group) => (
                <div key={group} className="mb-1">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                  {results
                    .filter((r) => r.group === group)
                    .map((r) => {
                      const index = results.indexOf(r);
                      const Icon = r.icon;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => select(r)}
                          onMouseEnter={() => setHighlighted(index)}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left",
                            index === highlighted && "bg-foreground/8"
                          )}
                        >
                          <span
                            className="flex size-7 shrink-0 items-center justify-center rounded-md"
                            style={{ backgroundColor: `color-mix(in srgb, ${r.color} 15%, transparent)`, color: r.color }}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{r.label}</span>
                            {r.description && <span className="block truncate text-xs text-muted-foreground">{r.description}</span>}
                          </span>
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
