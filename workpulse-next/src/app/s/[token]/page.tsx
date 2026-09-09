"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { shareApi, ApiError } from "@/lib/api/client";
import type { ShareableResourceType } from "@/lib/api/types";
import { SHARE_FIELDS } from "@/lib/share-fields";

/** The only page in the app meant to be reachable with zero login — a genuinely public "anyone
 * with the link" share, resolved entirely by the random token in the URL. Lives outside the
 * (app)/(auth) shells (no sidebar, no auth check) same as /privacy and /terms. */
export default function PublicSharePage() {
  const params = useParams<{ token: string }>();
  const [resourceType, setResourceType] = useState<ShareableResourceType | null>(null);
  const [permission, setPermission] = useState<"Read" | "Edit" | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    shareApi
      .getPublic(params.token)
      .then((res) => {
        setResourceType(res.resourceType);
        setPermission(res.permission);
        setData(res.data as Record<string, unknown>);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await shareApi.updatePublic(params.token, data);
      setData(res.data as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#0078D4] to-[#004f9e]">
            <Activity className="size-4 text-white" strokeWidth={2.5} />
          </div>
          WorkPulse
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Spinner size={16} /> Loading…
          </div>
        )}

        {!loading && (notFound || !resourceType || !data) && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              This link isn&apos;t valid anymore — it may have been unshared.
            </CardContent>
          </Card>
        )}

        {!loading && resourceType && data && (
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">
                  {String(data.title ?? data.label ?? data.destination ?? "Shared item")}
                </h1>
                <Badge variant={permission === "Edit" ? "default" : "secondary"}>{permission} access</Badge>
              </div>

              {SHARE_FIELDS[resourceType].map((f) => (
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

              {permission === "Edit" && (
                <Button onClick={handleSave} disabled={saving} className="w-fit">
                  {saving ? <Spinner size={16} /> : saved ? "Saved" : "Save"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Want your own WorkPulse account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
