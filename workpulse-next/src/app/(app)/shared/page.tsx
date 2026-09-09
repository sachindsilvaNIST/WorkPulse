"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, FileText, Library, Receipt, Ribbon, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { shareApi } from "@/lib/api/client";
import type { ShareableResourceType, SharedWithMeItem } from "@/lib/api/types";

const TYPE_META: Record<ShareableResourceType, { label: string; icon: typeof Briefcase; color: string }> = {
  TripReport: { label: "Business Trip", icon: Briefcase, color: "#5E5CE6" },
  TripDocument: { label: "Reimbursement", icon: Receipt, color: "#30D9C0" },
  DailyReport: { label: "Daily Report", icon: FileText, color: "#FF375F" },
  WeeklyReport: { label: "Weekly Report", icon: FileText, color: "#FF375F" },
  Contact: { label: "Contact", icon: Users, color: "#7ED957" },
  QuickLink: { label: "Bookmark", icon: Ribbon, color: "#FF6482" },
  Resource: { label: "Resource", icon: Library, color: "#5AC8FA" },
};

export default function SharedWithMePage() {
  const [items, setItems] = useState<SharedWithMeItem[] | null>(null);

  useEffect(() => {
    shareApi.sharedWithMe().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Shared with Me</h1>
        <p className="mt-1 text-muted-foreground">Items other people have shared with you</p>
      </div>

      {items === null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size={16} /> Loading…
        </div>
      )}
      {items !== null && items.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing&apos;s been shared with you yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {items?.map((item) => {
          const meta = TYPE_META[item.resourceType];
          const Icon = meta.icon;
          return (
            <Link key={item.shareId} href={`/shared/${item.shareId}`}>
              <Card className="flex flex-row items-center gap-3 p-3.5 transition-colors hover:bg-foreground/5">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}
                >
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {meta.label} · Shared by {item.ownerDisplayName}
                  </p>
                </div>
                <Badge variant={item.permission === "Edit" ? "default" : "secondary"}>{item.permission}</Badge>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
