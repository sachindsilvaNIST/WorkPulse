"use client";

import { useEffect, useState } from "react";
import { Download, Receipt, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reimbursementApi, tripReportsApi, downloadBlob } from "@/lib/api/client";
import type { TripDocumentWithTrip } from "@/lib/api/types";
import { categoryColor } from "@/lib/category-color";

export default function ReimbursementPage() {
  const [docs, setDocs] = useState<TripDocumentWithTrip[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      reimbursementApi.getAllDocuments(search || undefined).then((list) => {
        setDocs(list);
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleDownload(doc: TripDocumentWithTrip) {
    const { blob, fileName } = await tripReportsApi.downloadDocument(doc.tripReportId, doc.id);
    downloadBlob(blob, fileName || doc.fileName);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reimbursement</h1>
        <p className="mt-1 text-muted-foreground">Every trip document, found in a second</p>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by file name, label, or destination…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && docs.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Receipt className="size-10 opacity-40" />
          <p>No documents found.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => {
          const accent = categoryColor(d.category);
          return (
            <Card
              key={d.id}
              className="p-4"
              style={{
                backgroundColor: `color-mix(in srgb, ${accent} 8%, var(--card))`,
                borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <Badge style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
                  {d.category}
                </Badge>
                <Button size="icon" variant="ghost" onClick={() => handleDownload(d)}>
                  <Download className="size-4" />
                </Button>
              </div>
              <p className="mt-2 truncate font-medium">{d.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {d.tripDestination} · {d.tripStartDate}
              </p>
              {d.label && <p className="mt-1 text-xs text-muted-foreground">{d.label}</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
