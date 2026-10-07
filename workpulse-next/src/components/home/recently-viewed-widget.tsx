"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Clock3, Library, Users, type LucideIcon } from "lucide-react";
import { getRecentlyViewed, type RecentlyViewedEntry, type RecentlyViewedType } from "@/lib/recently-viewed";

const TYPE_META: Record<RecentlyViewedType, { icon: LucideIcon; color: string }> = {
  bookmark: { icon: Bookmark, color: "#FFD60A" },
  resource: { icon: Library, color: "#40C8E0" },
  contact: { icon: Users, color: "#30D158" },
};

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Apple-widget-style "last touched" strip — reads the client-only recently-viewed log (Bookmarks,
 * Resources, Contacts detail opens) written by recordView() on those pages. Renders nothing when
 * the log is empty rather than showing an empty-state card, since a brand new account has nothing
 * to show here yet and that's expected, not an error state. */
export function RecentlyViewedWidget() {
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>([]);

  useEffect(() => {
    setEntries(getRecentlyViewed());
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="glass-panel p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-body">
        <Clock3 className="size-4" />
        Recently Viewed
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {entries.map((entry) => {
          const meta = TYPE_META[entry.type];
          const Icon = meta.icon;
          return (
            <Link
              key={`${entry.type}-${entry.id}`}
              href={entry.href}
              className="flex min-w-40 shrink-0 flex-col gap-1.5 rounded-item border border-separator p-3 transition-colors hover:bg-fill-1"
            >
              <span
                className="flex size-7 items-center justify-center rounded-icon"
                style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}
              >
                <Icon className="size-4" strokeWidth={1.8} />
              </span>
              <span className="truncate text-sm font-medium">{entry.label}</span>
              <span className="truncate text-xs text-text-secondary">{entry.description || relativeTime(entry.viewedAt)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
