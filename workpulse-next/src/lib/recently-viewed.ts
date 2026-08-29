const KEY = "workpulse.recentlyViewed";
const MAX_ENTRIES = 8;

export type RecentlyViewedType = "bookmark" | "resource" | "contact";

export interface RecentlyViewedEntry {
  type: RecentlyViewedType;
  id: string;
  label: string;
  description: string;
  href: string;
  viewedAt: string;
}

/** Cross-page "last touched" tracking, client-only (localStorage) — same precedent as Settings'
 * own recently-viewed-sections strip. Call from wherever a detail view opens (Bookmarks,
 * Resources, Contacts, ...); read back via getRecentlyViewed() for the Home widget. */
export function recordView(entry: Omit<RecentlyViewedEntry, "viewedAt">) {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentlyViewed().filter((e) => !(e.type === entry.type && e.id === entry.id));
    const next = [{ ...entry, viewedAt: new Date().toISOString() }, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* localStorage unavailable — recently-viewed is a convenience, never worth failing over */
  }
}

export function getRecentlyViewed(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
