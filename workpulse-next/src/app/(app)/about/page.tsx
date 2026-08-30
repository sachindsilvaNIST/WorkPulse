"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";
import { InfoGlyph } from "@/components/ui/settings-glyphs";
import { APP_VERSION, APP_ENV, GIT_SHA } from "@/lib/version";
import { CHANGELOG } from "@/lib/changelog";
import { cn } from "@/lib/utils";

// Predates this Next.js app's own semver (which CHANGELOG tracks from 0.1.0) — WorkPulse started
// as a separate desktop codebase with its own version numbers, so these eras are kept as their
// own summarized section rather than mixed into CHANGELOG's version-ordered list.
const ORIGIN_STORY: { era: string; description: string }[] = [
  {
    era: "Desktop app (Avalonia/.NET)",
    description:
      "WorkPulse started as a native desktop attendance tracker with a built-in Contact Book — search, autocomplete, dark theme, and Business Trip tracking, reaching v1.0.x.",
  },
  {
    era: "API + Blazor Web (v2.x)",
    description:
      "Added a shared ASP.NET backend (EF Core, Identity, JWT auth) so a Blazor WebAssembly client could sync with the desktop app, plus an Admin dashboard, a Japanese dictionary with JLPT tagging and spaced repetition, and cloud deployment on Render/Postgres.",
  },
  {
    era: "Next.js web platform (now)",
    description: "A full redesign as this web app, continuing below from v0.1.0.",
  },
];

// A standalone sidebar page rather than a Settings sub-page — checking what's new and which
// version is running shouldn't require a detour through Settings first.
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <IconBadge icon={InfoGlyph} color="#AEAEB2" color2="#6E6E73" flat size="size-11" iconSize="size-6" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">About</h1>
          <p className="mt-1 text-muted-foreground">Version info and what&apos;s changed recently</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">WorkPulse Web — Attendance, Reports, Trips, and more, all in one place.</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium">v{APP_VERSION}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                APP_ENV === "Production" ? "bg-[#34C759]/15 text-[#34C759]" : "bg-[#FF9500]/15 text-[#FF9500]"
              )}
            >
              {APP_ENV}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">{GIT_SHA}</span>
          </div>
          <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Terms of Service
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4">
          <h2 className="font-semibold">Where WorkPulse Started</h2>
          {ORIGIN_STORY.map((item) => (
            <div key={item.era} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm font-semibold">{item.era}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="font-semibold">What&apos;s New</h2>
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">v{entry.version}</span>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {entry.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
