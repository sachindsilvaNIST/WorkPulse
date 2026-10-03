"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageToolbar } from "@/components/shell/page-toolbar";
import { IconBadge } from "@/components/ui/icon-badge";
import { InfoGlyph } from "@/components/ui/settings-glyphs";

// Predates this Next.js app's own semver (which the About page's changelog tracks from 0.1.0) —
// WorkPulse started as a separate desktop codebase with its own version numbers, so these eras
// are kept as their own page rather than mixed into that version-ordered list.
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
    description: "A full redesign as this web app, continuing in About's version history.",
  },
];

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageToolbar
        title="Where WorkPulse Started"
        description="From a desktop attendance tracker to this web app"
        icon={<IconBadge icon={InfoGlyph} color="#AEAEB2" color2="#6E6E73" flat size="size-11" iconSize="size-6" />}
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          {ORIGIN_STORY.map((item) => (
            <div key={item.era} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm font-semibold">{item.era}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/about" className="font-medium text-primary hover:underline">
          ← Back to About
        </Link>
      </p>
    </div>
  );
}
