"use client";

import { useEffect, useState } from "react";
import { ChevronDown, CloudUpload, Download, ExternalLink, Receipt, Upload, X } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryPicker } from "@/components/ui/category-picker";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { reimbursementApi, tripReportsApi, downloadBlob } from "@/lib/api/client";
import type { ReimbursementCategory, TripDocumentWithTrip, TripReport } from "@/lib/api/types";
import { categoryColor } from "@/lib/category-color";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

function emptyUpload() {
  return { file: null as File | null, category: "", tripReportId: "", label: "", documentDate: new Date().toISOString().slice(0, 10) };
}

export default function ReimbursementPage() {
  const [docs, setDocs] = useState<TripDocumentWithTrip[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [trips, setTrips] = useState<TripReport[]>([]);
  const [categories, setCategories] = useState<ReimbursementCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState(emptyUpload());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    tripReportsApi.getAll().then(setTrips);
    reimbursementApi.getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      reimbursementApi
        .getAllDocuments(search || undefined, selectedCategory !== "All" ? selectedCategory : undefined)
        .then((list) => {
          setDocs(list);
          setLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  async function handleDownload(doc: TripDocumentWithTrip) {
    const { blob, fileName } = await tripReportsApi.downloadDocument(doc.tripReportId, doc.id);
    downloadBlob(blob, fileName || doc.fileName);
  }

  function openUpload() {
    setForm(emptyUpload());
    setUploadError(null);
    setShowUpload(true);
  }

  const canSubmit = !!form.file && !!form.category && !!form.tripReportId && !uploading;

  async function handleSubmitUpload() {
    if (!form.file || !form.category || !form.tripReportId) {
      setUploadError("File, category, and a linked trip are all required.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const meta = await tripReportsApi.uploadDocument(form.tripReportId, form.file, form.category, form.label, form.documentDate || undefined);
      const trip = trips.find((t) => t.id === form.tripReportId);
      if (trip) {
        setDocs((prev) => [
          {
            ...meta,
            tripDestination: trip.destination,
            tripCategory: trip.category,
            tripStartDate: trip.startDate,
            tripEndDate: trip.endDate,
          },
          ...prev,
        ]);
        setTrips((prev) => prev.map((t) => (t.id === trip.id ? { ...t, documentCount: t.documentCount + 1 } : t)));
      }
      setShowUpload(false);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reimbursement</h1>
          <p className="mt-1 text-muted-foreground">Every trip document, found in a second</p>
        </div>
        <Button onClick={() => (showUpload ? setShowUpload(false) : openUpload())}>
          <Upload className="size-4" /> Upload
        </Button>
      </div>

      {showUpload && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  File <span className="text-destructive">*</span>
                </label>
                <FileDropZone
                  onFile={(file) => setForm({ ...form, file })}
                  className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-full border border-dashed border-input bg-background/50 px-4 text-sm text-muted-foreground backdrop-blur-md hover:bg-foreground/5"
                >
                  <CloudUpload className="size-4 shrink-0" />
                  <span className="truncate">{form.file ? form.file.name : "PDF, Word, Excel, image, or drop it here…"}</span>
                </FileDropZone>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Category <span className="text-destructive">*</span>
                </label>
                <CategoryPicker value={form.category} onChange={(category) => setForm({ ...form, category })} />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Business Trip <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-full border border-input bg-background/50 py-2 pl-4 pr-9 text-sm backdrop-blur-md outline-none"
                    value={form.tripReportId}
                    onChange={(e) => setForm({ ...form, tripReportId: e.target.value })}
                  >
                    <option value="">Select a trip…</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.destination} · {t.startDate} → {t.endDate}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
                {trips.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">No trips yet — create one under Business Trips first.</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Document Date</label>
                <Input
                  type="date"
                  value={form.documentDate}
                  onChange={(e) => setForm({ ...form, documentDate: e.target.value })}
                />
              </div>

              <Input
                className="sm:col-span-2"
                placeholder="Label (optional)"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>

            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

            <div className="flex gap-2">
              <Button onClick={handleSubmitUpload} disabled={!canSubmit}>
                {uploading ? <Spinner size={16} /> : <Upload className="size-4" />} {uploading ? "Uploading…" : "Upload"}
              </Button>
              <Button variant="outline" onClick={() => setShowUpload(false)}>
                <X className="size-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <SearchInput placeholder="Search by file name, label, or destination…" value={search} onValueChange={setSearch} className="mb-4 max-w-md" />

      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {[{ id: -1, name: "All" }, ...categories].map((c) => {
            const active = selectedCategory === c.name;
            const accent = c.name === "All" ? "var(--foreground)" : categoryColor(c.name);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.name)}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active ? "border-transparent text-white" : "border-input bg-background/50 text-muted-foreground hover:bg-foreground/5"
                )}
                style={active ? { backgroundColor: accent } : undefined}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>}
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
                <div className="flex items-center gap-1">
                  {d.driveWebViewLink && (
                    <Button size="icon" variant="ghost" asChild title="Open in Google Drive">
                      <a href={d.driveWebViewLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => handleDownload(d)} title="Download">
                    <Download className="size-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 truncate font-medium">{d.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {d.tripDestination} · {d.documentDate ?? d.tripStartDate}
              </p>
              {d.label && <p className="mt-1 text-xs text-muted-foreground">{d.label}</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
