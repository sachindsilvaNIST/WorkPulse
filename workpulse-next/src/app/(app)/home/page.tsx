"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { NAV_ITEMS, resolveNavColor } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";
import { useSpotlight } from "@/lib/spotlight-context";
import { attendanceApi, dailyReportsApi, tripReportsApi, reimbursementApi, quickLinksApi, contactsApi, gmailApi, resourcesApi } from "@/lib/api/client";
import { WeatherWidget } from "@/components/home/weather-widget";
import { ClockWidget } from "@/components/home/clock-widget";
import { RecentlyViewedWidget } from "@/components/home/recently-viewed-widget";

interface WidgetStat {
  primary: string;
  secondary: string;
}

// Hrefs with no natural "today's number" — these keep the plain description-tile look.
const NO_STAT_HREFS = new Set(["/settings"]);

// Bento-style, non-uniform sizing — an Apple widget gallery mixes 1-row and 2-row tall tiles
// rather than a uniform card grid. Relying on CSS auto-packing for that (grid-auto-flow: dense)
// left a dangling near-empty trailing row whenever a row-span-2 tile ran out of 1x1 neighbors to
// pair beside it, so every tile here gets an explicit grid position instead — hand-tiled into an
// exact 3-column x 6-row rectangle (18 cells, zero gaps) with row spans intentionally mixing odd
// (1) and even (2) for visual variety. Applies at the sm breakpoint and up; below that the grid
// collapses to a single column and tiles simply stack in DOM order.
const GRID_POSITION: Record<string, string> = {
  weather: "sm:col-start-1 sm:row-start-1 sm:col-span-2 sm:row-span-2",
  clock: "sm:col-start-3 sm:row-start-1",
  "/trips": "sm:col-start-3 sm:row-start-2 sm:row-span-2",
  "/dashboard": "sm:col-start-1 sm:row-start-3 sm:col-span-2",
  "/reports/daily": "sm:col-start-1 sm:row-start-4 sm:col-span-2",
  "/resources": "sm:col-start-3 sm:row-start-4 sm:row-span-2",
  "/reimbursement": "sm:col-start-1 sm:row-start-5",
  "/bookmarks": "sm:col-start-2 sm:row-start-5",
  "/contacts": "sm:col-start-1 sm:row-start-6",
  "/gmail-labels": "sm:col-start-2 sm:row-start-6",
  "/settings": "sm:col-start-3 sm:row-start-6",
  "/about": "sm:col-start-1 sm:row-start-7 sm:col-span-3",
};

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

    reimbursementApi.getAllDocuments().then((docs) => {
      stats["/reimbursement"] = { primary: `${docs.length}`, secondary: docs.length === 1 ? "document on file" : "documents on file" };
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
    <div className="mt-1 flex flex-col gap-2">
      <div className="h-6 w-20 animate-pulse rounded bg-white/20" />
      <div className="h-3.5 w-28 animate-pulse rounded bg-white/15" />
    </div>
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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back{displayName ? `, ${displayName.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s where things stand today</p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 flex w-full max-w-md cursor-pointer items-center gap-2.5 rounded-full border border-input bg-background/50 px-4 py-2.5 text-left text-sm text-muted-foreground backdrop-blur-md transition-colors hover:bg-foreground/5"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1">Search WorkPulse…</span>
          <kbd className="rounded-md border border-border bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
      </div>

      {/* auto-rows is a minmax floor, not a fixed height — tiles have min-h-44 (176px), taller
          than a fixed 160px track would allow, which was overflowing each tile into the gap
          below it and visually colliding with the next row (worse at larger font-size presets,
          since min-h-44 is rem-based and grows with the root font size). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:auto-rows-[minmax(160px,auto)]">
        <div className={GRID_POSITION.weather}>
          <WeatherWidget />
        </div>
        <div className={GRID_POSITION.clock}>
          <ClockWidget />
        </div>

        {tiles.map((tile) => {
          const Icon = tile.icon;
          const color = resolveNavColor(tile.color);
          const color2 = resolveNavColor(tile.color2 ?? tile.color);
          const stat = stats[tile.href];
          const showStat = !NO_STAT_HREFS.has(tile.href);
          return (
            <div key={tile.href} className={GRID_POSITION[tile.href]}>
              <Link
                href={tile.href}
                className="group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl border border-white/20 p-6 text-white backdrop-blur-2xl backdrop-saturate-200 sm:h-full"
                style={{
                  background: `linear-gradient(150deg, color-mix(in srgb, ${color} 85%, white 12%) 0%, ${color} 45%, ${color2} 75%, color-mix(in srgb, ${color2} 80%, black 30%) 100%)`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -20px 40px -20px rgba(0,0,0,0.3), 0 12px 32px -12px rgba(0,0,0,0.4)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-[22%] bg-white/15">
                    <Icon className="size-5.5" />
                  </div>
                  <ArrowUpRight className="size-5 opacity-0 transition-opacity duration-200 group-hover:opacity-80" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{tile.label}</h3>
                  {showStat ? (
                    statsLoading && !stat ? (
                      <StatSkeleton />
                    ) : stat ? (
                      <>
                        <p className="mt-1 text-2xl font-bold leading-tight">{stat.primary}</p>
                        <p className="text-sm text-white/80">{stat.secondary}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-white/80">{tile.description}</p>
                    )
                  ) : (
                    <p className="mt-1 text-sm text-white/80">{tile.description}</p>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <RecentlyViewedWidget />
      </div>
    </div>
  );
}
