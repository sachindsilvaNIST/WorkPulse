"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { NAV_ITEMS, resolveNavColor, type NavItem } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";
import { useSpotlight } from "@/lib/spotlight-context";
import { attendanceApi, dailyReportsApi, tripReportsApi, quickLinksApi, contactsApi, gmailApi, resourcesApi } from "@/lib/api/client";
import { PageToolbar } from "@/components/shell/page-toolbar";
import { WeatherWidget } from "@/components/home/weather-widget";
import { ClockWidget } from "@/components/home/clock-widget";
import { RecentlyViewedWidget } from "@/components/home/recently-viewed-widget";

interface WidgetStat {
  primary: string;
  secondary: string;
}

// Hrefs with no natural "today's number" — these keep the plain description-tile look.
const NO_STAT_HREFS = new Set(["/settings"]);

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

async function fetchWidgetStats(): Promise<Record<string, WidgetStat>> {
  const stats: Record<string, WidgetStat> = {};
  const todayStr = new Date().toISOString().slice(0, 10);

  await Promise.allSettled([
    attendanceApi.getMonths().then(async (months) => {
      const now = new Date();
      const current = months.find((m) => m.year === now.getFullYear() && m.month === now.getMonth() + 1);
      if (!current) {
        stats["/dashboard"] = { primary: "0 days", secondary: "No entries yet this month" };
        return;
      }
      const data = await attendanceApi.getMonth(current.year, current.month);
      const logged = data.records.length;
      stats["/dashboard"] = { primary: `${logged} ${logged === 1 ? "day" : "days"}`, secondary: `Logged in ${current.label}` };
    }),

    dailyReportsApi.getAll().then((reports) => {
      const hasToday = reports.some((r) => r.reportDate === todayStr);
      stats["/reports/daily"] = hasToday
        ? { primary: "Logged ✓", secondary: "Today's report is filled in" }
        : { primary: "Not yet", secondary: "Today's report isn't written" };
    }),

    tripReportsApi.getAll().then((trips) => {
      const active = trips.find((t) => t.startDate <= todayStr && t.endDate >= todayStr);
      if (active) {
        stats["/trips"] = { primary: "On a trip", secondary: active.destination };
        return;
      }
      const upcoming = [...trips].filter((t) => t.startDate > todayStr).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
      stats["/trips"] = upcoming
        ? { primary: `${daysUntil(upcoming.startDate)}d away`, secondary: `Next: ${upcoming.destination}` }
        : { primary: `${trips.length}`, secondary: trips.length === 1 ? "trip on record" : "trips on record" };
    }),

    quickLinksApi.getAll().then((links) => {
      stats["/bookmarks"] = { primary: `${links.length}`, secondary: links.length === 1 ? "bookmark saved" : "bookmarks saved" };
    }),

    contactsApi.getAll().then(({ contacts }) => {
      stats["/contacts"] = { primary: `${contacts.length}`, secondary: contacts.length === 1 ? "contact saved" : "contacts saved" };
    }),

    gmailApi.status().then((status) => {
      stats["/gmail-labels"] = status.connected
        ? { primary: "Connected", secondary: status.emailAddress ?? "Synced" }
        : { primary: "Not connected", secondary: "Connect in Settings" };
    }),

    resourcesApi.getAll().then((items) => {
      stats["/resources"] = { primary: `${items.length}`, secondary: items.length === 1 ? "resource saved" : "resources saved" };
    }),
  ]);

  return stats;
}

function StatSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-6 w-16 animate-pulse rounded bg-fill-1" />
      <div className="h-3.5 w-24 animate-pulse rounded bg-fill-1" />
    </div>
  );
}

/** Nav tile styled like the app's StatTile: label + colored icon chip on top, a big value below,
 * a caption underneath — the same shape as the Dashboard stat tiles, just wrapped in a link. */
function HomeTile({ tile, stat, loading }: { tile: NavItem; stat: WidgetStat | undefined; loading: boolean }) {
  const Icon = tile.icon;
  const color = resolveNavColor(tile.color);
  const showStat = !NO_STAT_HREFS.has(tile.href);

  return (
    <Link
      href={tile.href}
      className="glass group flex min-h-[152px] flex-col justify-between gap-3 rounded-tile p-[18px] transition-[background-color,transform] duration-[160ms] ease-glass hover:bg-fill-1 active:scale-[0.98] motion-reduce:active:scale-100"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-icon"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          <Icon className="size-[18px]" strokeWidth={1.8} />
        </span>
        <ArrowUpRight className="size-4 text-text-tertiary opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-text-secondary">{tile.label}</p>
        {showStat && (loading && !stat) ? (
          <StatSkeleton />
        ) : showStat && stat ? (
          <>
            <p className="mt-0.5 text-xl font-bold tracking-[-0.02em] text-text-primary">{stat.primary}</p>
            <p className="text-xs text-text-secondary">{stat.secondary}</p>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-text-secondary">{tile.description}</p>
        )}
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { displayName } = useAuth();
  const { setOpen } = useSpotlight();
  const tiles = NAV_ITEMS.filter((item) => item.href !== "/home" && !item.disabled);
  const isMac = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");

  const [stats, setStats] = useState<Record<string, WidgetStat>>({});
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchWidgetStats()
      .then(setStats)
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <PageToolbar
          title={`Welcome back${displayName ? `, ${displayName.split(" ")[0]}` : ""}`}
          description="Here's where things stand today"
        />

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-full max-w-md cursor-pointer items-center gap-2.5 rounded-pill bg-fill-1 px-4 text-left text-[15px] text-text-secondary transition-colors hover:bg-fill-2 outline-none focus-visible:shadow-focus-ring"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1">Search WorkPulse…</span>
          <kbd className="rounded-md bg-fill-2 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-text-tertiary">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WeatherWidget />
        <ClockWidget />
        {tiles.map((tile) => (
          <HomeTile key={tile.href} tile={tile} stat={stats[tile.href]} loading={statsLoading} />
        ))}
      </div>

      <div className="mt-4">
        <RecentlyViewedWidget />
      </div>
    </div>
  );
}
