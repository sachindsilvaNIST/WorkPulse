"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { gmailApi } from "@/lib/api/client";
import type { GmailStatus } from "@/lib/api/types";

// Stage 1 of the Gmail Label Manager: OAuth connection only. Label browsing/search/CRUD (Stage 2),
// message browsing (Stage 3), and real-time push sync (Stage 4) land in later passes — see the
// approved plan for the full build order.
export default function GmailLabelsPage() {
  const [status, setStatus] = useState<GmailStatus | null>(null);

  useEffect(() => {
    gmailApi.status().then(setStatus).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Gmail Labels</h1>
        <p className="mt-1 text-muted-foreground">Pattern-search and manage your Gmail label tree</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EA4335]/10 text-[#EA4335]">
            <Mail className="size-6" />
          </div>
          {status?.connected ? (
            <>
              <p className="font-medium">Connected as {status.emailAddress}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Label browsing, search and management land here in the next build pass.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Connect your Gmail account to get started</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Head to Settings to connect the Gmail account whose labels you want to search and manage.
              </p>
              <Button asChild className="mt-2">
                <Link href="/settings">Go to Settings</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
