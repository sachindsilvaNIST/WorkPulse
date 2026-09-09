"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  shareApi,
  quickLinksApi,
  contactsApi,
  dailyReportsApi,
  weeklyReportsApi,
  tripReportsApi,
  resourcesApi,
  ApiError,
} from "@/lib/api/client";
import type { ShareableResourceType } from "@/lib/api/types";
import { SHARE_FIELDS } from "@/lib/share-fields";

// TripDocument has no editable-fields path (the existing update-document endpoint only covers
// amount/currency/status/resource-link, not label/category — those are set once at upload time
// and this generic viewer isn't the place to add that), so it's intentionally excluded from the
// FIELDS/save dispatch below rather than pretending to save something that silently wouldn't.
async function saveByType(resourceType: Exclude<ShareableResourceType, "TripDocument">, data: Record<string, unknown>) {
  const id = data.id as string;
  switch (resourceType) {
    case "TripReport":
      return tripReportsApi.update(id, data as never);
    case "DailyReport":
      return dailyReportsApi.update(id, data as never);
    case "WeeklyReport":
      return weeklyReportsApi.update(id, data as never);
    case "Contact":
      return contactsApi.update(id, data as never);
    case "QuickLink":
      return quickLinksApi.update(id, data as never);
    case "Resource":
      return resourcesApi.update(id, data as never);
  }
}

export default function SharedItemPage() {
  const params = useParams<{ shareId: string }>();
  const router = useRouter();
  const [resourceType, setResourceType] = useState<ShareableResourceType | null>(null);
  const [permission, setPermission] = useState<"Read" | "Edit" | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    shareApi
      .getSharedData(params.shareId)
      .then((res) => {
        setResourceType(res.resourceType);
        setPermission(res.permission);
        setData(res.data as Record<string, unknown>);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.shareId]);

  async function handleSave() {
    if (!resourceType || resourceType === "TripDocument" || !data) return;
    setSaving(true);
    setError(null);
    try {
      await saveByType(resourceType, data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center gap-2 py-16 text-sm text-muted-foreground">
        <Spinner size={16} /> Loading…
      </div>
    );
  }

  if (notFound || !resourceType || !data) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-muted-foreground">
        This item isn&apos;t available anymore — it may have been unshared or deleted.
      </div>
    );
  }

  const fields = SHARE_FIELDS[resourceType];

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.push("/shared")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Shared with Me
      </button>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{String(data.title ?? data.label ?? data.destination ?? "Shared item")}</h1>
            <Badge variant={permission === "Edit" ? "default" : "secondary"}>{permission}</Badge>
          </div>

          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
              {f.multiline ? (
                <Textarea
                  value={String(data[f.key] ?? "")}
                  onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                  disabled={permission !== "Edit"}
                  rows={4}
                />
              ) : (
                <Input
                  value={String(data[f.key] ?? "")}
                  onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                  disabled={permission !== "Edit"}
                />
              )}
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {permission === "Edit" && resourceType !== "TripDocument" && (
            <Button onClick={handleSave} disabled={saving} className="w-fit">
              {saving ? <Spinner size={16} /> : "Save"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
