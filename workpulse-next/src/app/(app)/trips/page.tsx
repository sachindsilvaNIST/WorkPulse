"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Download, FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CategoryPicker } from "@/components/ui/category-picker";
import { tripReportsApi, downloadBlob } from "@/lib/api/client";
import type { TripCategory, TripDocumentMeta, TripReport } from "@/lib/api/types";

function emptyTrip(): Partial<TripReport> {
  const today = new Date().toISOString().slice(0, 10);
  return { category: "Domestic", destination: "", startDate: today, endDate: today, purpose: "", notes: "" };
}

export default function TripsPage() {
  const [trips, setTrips] = useState<TripReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<TripReport>>(emptyTrip());
  const [loading, setLoading] = useState(true);

  const [docs, setDocs] = useState<TripDocumentMeta[]>([]);
  const [docCategory, setDocCategory] = useState("");
  const [docLabel, setDocLabel] = useState("");
  const [docDate, setDocDate] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    tripReportsApi.getAll().then((list) => {
      setTrips(list);
      setLoading(false);
    });
  }, []);

  const selected = useMemo(() => trips.find((t) => t.id === selectedId) ?? null, [trips, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDocs([]);
      return;
    }
    tripReportsApi.getDocuments(selectedId).then(setDocs);
  }, [selectedId]);

  async function handleSaveTrip() {
    if (!form.destination) return;
    const created = await tripReportsApi.create(form);
    setTrips((prev) => [created, ...prev]);
    setShowForm(false);
    setForm(emptyTrip());
    setSelectedId(created.id);
  }

  async function handleDeleteTrip(id: string) {
    await tripReportsApi.delete(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId || !docCategory) return;
    setUploading(true);
    try {
      const meta = await tripReportsApi.uploadDocument(selectedId, file, docCategory, docLabel, docDate || undefined);
      setDocs((prev) => [meta, ...prev]);
      setDocLabel("");
      setTrips((prev) => prev.map((t) => (t.id === selectedId ? { ...t, documentCount: t.documentCount + 1 } : t)));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDownload(doc: TripDocumentMeta) {
    if (!selectedId) return;
    const { blob, fileName } = await tripReportsApi.downloadDocument(selectedId, doc.id);
    downloadBlob(blob, fileName || doc.fileName);
  }

  async function handleDeleteDoc(docId: string) {
    if (!selectedId) return;
    await tripReportsApi.deleteDocument(selectedId, docId);
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    setTrips((prev) => prev.map((t) => (t.id === selectedId ? { ...t, documentCount: Math.max(0, t.documentCount - 1) } : t)));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Trips</h1>
          <p className="mt-1 text-muted-foreground">Trip reports, receipts, tickets and documents</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" /> New Trip
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              className="h-10 rounded-full border border-input bg-background/50 px-4 text-sm backdrop-blur-md outline-none"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TripCategory })}
            >
              <option value="Domestic">Domestic</option>
              <option value="Overseas">Overseas</option>
            </select>
            <Input
              placeholder="Destination"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
            />
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <Input
              className="sm:col-span-2"
              placeholder="Purpose"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
            <Textarea
              className="sm:col-span-2"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={handleSaveTrip}>Save Trip</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && trips.length === 0 && <p className="text-sm text-muted-foreground">No trips yet.</p>}
          {trips.map((t) => (
            <motion.div key={t.id} whileHover={{ y: -2 }}>
              <Card
                onClick={() => setSelectedId(t.id)}
                className={`cursor-pointer p-4 ${selectedId === t.id ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{t.category}</Badge>
                      <span className="font-semibold">{t.destination}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.startDate} → {t.endDate}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{t.purpose}</p>
                    {t.documentCount > 0 && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="size-3" /> {t.documentCount} document{t.documentCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <Trash2
                    className="size-4 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrip(t.id);
                    }}
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="min-h-[300px]">
          {!selected ? (
            <CardContent className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Briefcase className="size-10 opacity-40" />
              <p>Select a trip to manage its documents.</p>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold">{selected.destination}</h3>
                <p className="text-sm text-muted-foreground">{selected.purpose}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-background/40 p-3">
                <CategoryPicker value={docCategory} onChange={setDocCategory} className="h-9 w-40" placeholder="Category" />
                <Input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="h-9 w-36"
                  title="Document date (optional)"
                />
                <Input
                  placeholder="Label (optional)"
                  value={docLabel}
                  onChange={(e) => setDocLabel(e.target.value)}
                  className="h-9 flex-1"
                />
                <Button asChild size="sm" variant="glass" disabled={uploading || !docCategory}>
                  <label className={docCategory ? "cursor-pointer" : "cursor-not-allowed opacity-60"}>
                    <Upload className="size-3.5" /> {uploading ? "Uploading…" : "Upload"}
                    <input type="file" className="hidden" onChange={handleUpload} disabled={uploading || !docCategory} />
                  </label>
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-background/30 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{d.category}</Badge>
                        <span className="truncate text-sm font-medium">{d.fileName}</span>
                      </div>
                      {d.label && <p className="text-xs text-muted-foreground">{d.label}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleDownload(d)}>
                        <Download className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteDoc(d.id)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
