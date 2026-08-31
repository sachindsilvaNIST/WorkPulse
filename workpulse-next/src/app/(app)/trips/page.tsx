"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Download, FileText, Link2, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CategoryPicker } from "@/components/ui/category-picker";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { ResourcePickerDialog, ResourceLinkChip } from "@/components/ui/resource-picker-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { tripReportsApi, resourcesApi, downloadBlob } from "@/lib/api/client";
import type { Resource, TripCategory, TripDocumentMeta, TripReport, TripStatus } from "@/lib/api/types";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function emptyTrip(): Partial<TripReport> {
  const today = new Date().toISOString().slice(0, 10);
  return { category: "Domestic", destination: "", startDate: today, endDate: today, purpose: "", notes: "", status: "Planned" };
}

const STATUS_LABEL: Record<TripStatus, string> = { Planned: "Planned", InProgress: "In Progress", Completed: "Completed" };
const STATUS_COLOR: Record<TripStatus, string> = { Planned: "#8E8E93", InProgress: "#FF9500", Completed: "#34C759" };
const CURRENCIES = ["USD", "JPY", "EUR", "GBP"];

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
  const [docAmount, setDocAmount] = useState("");
  const [docCurrency, setDocCurrency] = useState("USD");
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [linkingDocId, setLinkingDocId] = useState<string | null>(null);
  const [confirmDeleteTripId, setConfirmDeleteTripId] = useState<string | null>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);
  const [resourceTitles, setResourceTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    tripReportsApi.getAll().then((list) => {
      setTrips(list);
      setLoading(false);
    });
    resourcesApi.getAll().then((list) => {
      setResourceTitles(Object.fromEntries(list.map((r) => [r.id, r.title])));
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

  async function handleStatusChange(trip: TripReport, status: TripStatus) {
    const updated = await tripReportsApi.update(trip.id, { ...trip, status });
    setTrips((prev) => prev.map((t) => (t.id === trip.id ? updated : t)));
  }

  async function handleFile(file: File) {
    if (!selectedId || !docCategory) return;
    setUploading(true);
    try {
      const amount = docAmount.trim() ? Number(docAmount) : undefined;
      const meta = await tripReportsApi.uploadDocument(selectedId, file, docCategory, docLabel, docDate || undefined, amount, docCurrency);
      setDocs((prev) => [meta, ...prev]);
      setDocLabel("");
      setDocAmount("");
      setTrips((prev) => prev.map((t) => (t.id === selectedId ? { ...t, documentCount: t.documentCount + 1 } : t)));
    } finally {
      setUploading(false);
    }
  }

  async function handleExport(format: "xlsx" | "html") {
    if (!selectedId) return;
    setExporting(true);
    try {
      const { blob, fileName } = await tripReportsApi.exportTrip(selectedId, format);
      downloadBlob(blob, fileName);
    } finally {
      setExporting(false);
    }
  }

  async function handleLinkResource(docId: string, resource: Resource) {
    if (!selectedId) return;
    const updated = await tripReportsApi.updateDocument(selectedId, docId, { resourceId: resource.id });
    setDocs((prev) => prev.map((d) => (d.id === docId ? updated : d)));
    setResourceTitles((prev) => ({ ...prev, [resource.id]: resource.title }));
  }

  async function handleUnlinkResource(docId: string) {
    if (!selectedId) return;
    const updated = await tripReportsApi.updateDocument(selectedId, docId, { clearResourceLink: true });
    setDocs((prev) => prev.map((d) => (d.id === docId ? updated : d)));
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
          <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveTrip();
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <select
              className="h-10 rounded-full border border-input bg-background/50 px-4 text-sm backdrop-blur-md outline-none"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TripCategory })}
            >
              <option value="Domestic">Domestic</option>
              <option value="Overseas">Overseas</option>
            </select>
            <select
              className="h-10 rounded-full border border-input bg-background/50 px-4 text-sm backdrop-blur-md outline-none"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TripStatus })}
            >
              {(Object.keys(STATUS_LABEL) as TripStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <Input
              className="sm:col-span-2"
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
              <Button type="submit">Save Trip</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>}
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
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[t.status] }} />
                        {STATUS_LABEL[t.status]}
                      </span>
                      · {t.startDate} → {t.endDate}
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
                      setConfirmDeleteTripId(t.id);
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{selected.destination}</h3>
                  <p className="text-sm text-muted-foreground">{selected.purpose}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    className="h-8 rounded-full border border-input bg-background/50 px-3 text-xs backdrop-blur-md outline-none"
                    value={selected.status}
                    onChange={(e) => handleStatusChange(selected, e.target.value as TripStatus)}
                  >
                    {(Object.keys(STATUS_LABEL) as TripStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => handleExport("xlsx")} disabled={exporting}>
                    {exporting ? <Spinner size={14} /> : <Download className="size-3.5" />} Export
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport("html")} disabled={exporting}>
                    HTML
                  </Button>
                </div>
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
                <Input
                  type="number"
                  placeholder="Amount"
                  value={docAmount}
                  onChange={(e) => setDocAmount(e.target.value)}
                  className="h-9 w-24"
                  title="Expense amount (optional)"
                />
                <select
                  className="h-9 rounded-full border border-input bg-background/50 px-3 text-sm backdrop-blur-md outline-none"
                  value={docCurrency}
                  onChange={(e) => setDocCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <FileDropZone
                  onFile={handleFile}
                  disabled={uploading || !docCategory}
                  className={cn(
                    "inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-3 text-xs font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md hover:bg-white/15",
                    (uploading || !docCategory) && "pointer-events-none cursor-not-allowed opacity-50"
                  )}
                >
                  {uploading ? <Spinner size={14} /> : <Upload className="size-3.5" />} {uploading ? "Uploading…" : "Upload or drop a file"}
                </FileDropZone>
              </div>

              {docs.some((d) => d.amount != null) && (
                <p className="text-right text-sm font-semibold">
                  Total: {docs.filter((d) => d.amount != null).reduce((sum, d) => sum + (d.amount ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  {docs.find((d) => d.amount != null)?.currency}
                </p>
              )}

              <div className="flex flex-col gap-2">
                {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-background/30 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{d.category}</Badge>
                        <span className="truncate text-sm font-medium">{d.fileName}</span>
                        {d.amount != null && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {d.currency}
                          </span>
                        )}
                        {d.resourceId && resourceTitles[d.resourceId] && (
                          <ResourceLinkChip resource={{ id: d.resourceId, title: resourceTitles[d.resourceId] }} onRemove={() => handleUnlinkResource(d.id)} />
                        )}
                      </div>
                      {d.label && <p className="text-xs text-muted-foreground">{d.label}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setLinkingDocId(d.id)} title="Link to a Resource">
                        <Link2 className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDownload(d)}>
                        <Download className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDeleteDocId(d.id)}>
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

      <ResourcePickerDialog
        open={linkingDocId !== null}
        onClose={() => setLinkingDocId(null)}
        onSelect={(resource) => {
          if (linkingDocId) handleLinkResource(linkingDocId, resource);
        }}
      />

      {confirmDeleteTripId &&
        (() => {
          const target = trips.find((t) => t.id === confirmDeleteTripId);
          return (
            <ConfirmDialog
              title="Delete this trip?"
              description={
                target
                  ? `${target.destination} and its ${target.documentCount} document${target.documentCount === 1 ? "" : "s"} will be permanently removed.`
                  : "This trip will be permanently removed."
              }
              confirmLabel="Delete"
              cancelLabel="Cancel"
              onConfirm={() => {
                handleDeleteTrip(confirmDeleteTripId);
                setConfirmDeleteTripId(null);
              }}
              onCancel={() => setConfirmDeleteTripId(null)}
            />
          );
        })()}

      {confirmDeleteDocId &&
        (() => {
          const target = docs.find((d) => d.id === confirmDeleteDocId);
          return (
            <ConfirmDialog
              title="Delete this document?"
              description={target?.label ? `“${target.label}” will be permanently removed.` : "This document will be permanently removed."}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              onConfirm={() => {
                handleDeleteDoc(confirmDeleteDocId);
                setConfirmDeleteDocId(null);
              }}
              onCancel={() => setConfirmDeleteDocId(null)}
            />
          );
        })()}
    </div>
  );
}
