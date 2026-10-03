"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Briefcase, Download, FileText, Link2, Plus, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageToolbar } from "@/components/shell/page-toolbar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CategoryPicker } from "@/components/ui/category-picker";
import { AppleSelect } from "@/components/ui/apple-select";
import { AppleDatePicker } from "@/components/ui/apple-date-picker";
import { AppleTimePicker } from "@/components/ui/apple-time-picker";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { ResourcePickerDialog, ResourceLinkChip } from "@/components/ui/resource-picker-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ShareButton } from "@/components/ui/share-button";
import { tripReportsApi, resourcesApi, downloadBlob, ApiError } from "@/lib/api/client";
import type {
  Resource,
  TripBudgetLine,
  TripCategory,
  TripDocumentMeta,
  TripReport,
  TripSegment,
  TripSettlement,
  TripSettlementOtherLine,
  TripSettlementTransportationLine,
  TripStatus,
} from "@/lib/api/types";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function emptyTrip(): Partial<TripReport> {
  const today = new Date().toISOString().slice(0, 10);
  return { category: "Domestic", destination: "", startDate: today, endDate: today, purpose: "", notes: "", status: "Draft" };
}

function emptySettlement(tripReportId: string): TripSettlement {
  return {
    tripReportId,
    employeeNo: "",
    bankAccountNumber: "",
    bank: "",
    branch: "",
    locationAtSettlement: "",
    region: "",
    accountingCode: "",
    sourceDocumentNo: "",
    transportationLines: [],
    otherLines: [],
  };
}

const STATUS_LABEL: Record<TripStatus, string> = { Draft: "Draft", Submitted: "Submitted", Approved: "Approved", Settled: "Settled" };
const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as TripStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }));
const TRIP_STATUS_VARIANT: Record<TripStatus, "neutral" | "info" | "success" | "warning"> = {
  Draft: "neutral",
  Submitted: "warning",
  Approved: "success",
  Settled: "info",
};
const CATEGORY_OPTIONS: { value: TripCategory; label: string }[] = [
  { value: "Domestic", label: "Domestic" },
  { value: "Overseas", label: "Overseas" },
];
const CURRENCIES = ["USD", "JPY", "EUR", "GBP"];
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

let segTempId = 0;
const nextSegId = () => `_new_${++segTempId}`;

function inputCls(extra?: string) {
  return cn("h-8 w-full rounded-lg border border-input bg-background/50 px-2 text-xs outline-none backdrop-blur-md", extra);
}

// Scheduled departure/return are stored as one ISO datetime string, but a native <input
// type="datetime-local"> renders its date and time sub-fields cramped together inside this app's
// pill-shaped (rounded-full) Input — splitting into separate date + time inputs (matching the
// source system's own separate date/time columns) fixes that and gives each field proper room.
function splitDateTime(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const [date, timePart] = iso.slice(0, 16).split("T");
  return { date: date ?? "", time: timePart ?? "" };
}
function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  return `${date}T${time || "00:00"}:00`;
}

export default function TripsPage() {
  const searchParams = useSearchParams();
  const [trips, setTrips] = useState<TripReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(() => searchParams.get("new") === "1");
  const [form, setForm] = useState<Partial<TripReport>>(emptyTrip());
  const [loading, setLoading] = useState(true);

  // The Application-section editable copy of the selected trip — separate from `trips` so edits
  // don't hit the list/detail header until explicitly saved.
  const [appForm, setAppForm] = useState<TripReport | null>(null);
  const [savingApp, setSavingApp] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const [settlement, setSettlement] = useState<TripSettlement | null>(null);
  const [savingSettlement, setSavingSettlement] = useState(false);
1
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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resourceTitles, setResourceTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    tripReportsApi.getAll().then((list) => {
      setTrips(list);
      setLoading(false);
      // Lets Spotlight jump straight to a specific trip (`?open=<id>`).
      const openId = searchParams.get("open");
      if (openId && list.some((t) => t.id === openId)) setSelectedId(openId);
    });
    resourcesApi.getAll().then((list) => {
      setResourceTitles(Object.fromEntries(list.map((r) => [r.id, r.title])));
    });
  }, [searchParams]);

  const selected = useMemo(() => trips.find((t) => t.id === selectedId) ?? null, [trips, selectedId]);

  useEffect(() => {
    async function load() {
      if (!selectedId || !selected) {
        setDocs([]);
        setAppForm(null);
        setSettlement(null);
        return;
      }
      setAppForm(selected);
      setAppError(null);
      const [documents, settlementData] = await Promise.all([
        tripReportsApi.getDocuments(selectedId),
        tripReportsApi.getSettlement(selectedId).catch(() => emptySettlement(selectedId)),
      ]);
      setDocs(documents);
      setSettlement(settlementData);
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setDeleteError(null);
    try {
      await tripReportsApi.delete(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete this trip.");
    }
  }

  async function handleStatusChange(trip: TripReport, status: TripStatus) {
    const updated = await tripReportsApi.update(trip.id, { ...trip, status });
    setTrips((prev) => prev.map((t) => (t.id === trip.id ? updated : t)));
    if (appForm && appForm.id === trip.id) setAppForm(updated);
  }

  async function handleSaveApplication() {
    if (!appForm) return;
    setSavingApp(true);
    setAppError(null);
    try {
      const updated = await tripReportsApi.update(appForm.id, appForm);
      setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setAppForm(updated);
    } catch (err) {
      setAppError(err instanceof ApiError ? err.message : "Couldn't save the application.");
    } finally {
      setSavingApp(false);
    }
  }

  async function handleSaveSettlement() {
    if (!settlement || !selectedId) return;
    setSavingSettlement(true);
    try {
      const updated = await tripReportsApi.saveSettlement(selectedId, settlement);
      setSettlement(updated);
    } finally {
      setSavingSettlement(false);
    }
  }

  function updateSegment(id: string, patch: Partial<TripSegment>) {
    setAppForm((prev) => (prev ? { ...prev, segments: prev.segments.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : prev));
  }
  function addSegment() {
    setAppForm((prev) =>
      prev
        ? {
            ...prev,
            segments: [
              ...prev.segments,
              { id: nextSegId(), sequenceNo: prev.segments.length + 1, purpose: "", content: "", projectNo: "", destinationName: "", placeName: "", date1: null, date2: null },
            ],
          }
        : prev
    );
  }
  function removeSegment(id: string) {
    setAppForm((prev) => (prev ? { ...prev, segments: prev.segments.filter((s) => s.id !== id) } : prev));
  }

  function updateBudgetLine(id: string, patch: Partial<TripBudgetLine>) {
    setAppForm((prev) => (prev ? { ...prev, budgetLines: prev.budgetLines.map((b) => (b.id === id ? { ...b, ...patch } : b)) } : prev));
  }
  function addBudgetLine() {
    setAppForm((prev) => (prev ? { ...prev, budgetLines: [...prev.budgetLines, { id: nextSegId(), content: "", expenseCategory: "", amount: 0 }] } : prev));
  }
  function removeBudgetLine(id: string) {
    setAppForm((prev) => (prev ? { ...prev, budgetLines: prev.budgetLines.filter((b) => b.id !== id) } : prev));
  }

  function updateTransportLine(id: string, patch: Partial<TripSettlementTransportationLine>) {
    setSettlement((prev) => (prev ? { ...prev, transportationLines: prev.transportationLines.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : prev));
  }
  function addTransportLine() {
    setSettlement((prev) =>
      prev
        ? {
            ...prev,
            transportationLines: [
              ...prev.transportationLines,
              {
                id: nextSegId(),
                date: null,
                content: "",
                destinationName: "",
                placeName: "",
                route: "",
                transportMode: "",
                departureTime: "",
                arrivalTime: "",
                gasCost: null,
                tollCost: null,
                transportationCost: 0,
                lodgingCost: 0,
                dailyAllowance: 0,
              },
            ],
          }
        : prev
    );
  }
  function removeTransportLine(id: string) {
    setSettlement((prev) => (prev ? { ...prev, transportationLines: prev.transportationLines.filter((l) => l.id !== id) } : prev));
  }

  function updateOtherLine(id: string, patch: Partial<TripSettlementOtherLine>) {
    setSettlement((prev) => (prev ? { ...prev, otherLines: prev.otherLines.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : prev));
  }
  function addOtherLine() {
    setSettlement((prev) =>
      prev
        ? { ...prev, otherLines: [...prev.otherLines, { id: nextSegId(), date: null, content: "", description: "", departmentCode: "", expenseCategoryTaxCode: "", settlementAmount: 0 }] }
        : prev
    );
  }
  function removeOtherLine(id: string) {
    setSettlement((prev) => (prev ? { ...prev, otherLines: prev.otherLines.filter((l) => l.id !== id) } : prev));
  }

  const budgetTotal = useMemo(() => (appForm?.budgetLines ?? []).reduce((sum, b) => sum + (Number(b.amount) || 0), 0), [appForm]);
  const settlementTotal = useMemo(() => {
    if (!settlement) return 0;
    const transport = settlement.transportationLines.reduce((sum, l) => sum + (Number(l.transportationCost) || 0) + (Number(l.lodgingCost) || 0) + (Number(l.dailyAllowance) || 0), 0);
    const other = settlement.otherLines.reduce((sum, l) => sum + (Number(l.settlementAmount) || 0), 0);
    return transport + other;
  }, [settlement]);

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
      <PageToolbar title="Business Trips" description="Applications, settlements, receipts and tickets">
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" /> New Trip
        </Button>
      </PageToolbar>

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
            <AppleSelect value={form.category ?? "Domestic"} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORY_OPTIONS} />
            <AppleSelect value={form.status ?? "Draft"} onChange={(v) => setForm({ ...form, status: v })} options={STATUS_OPTIONS} />
            <Input
              className="sm:col-span-2"
              placeholder="Destination"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
            />
            <AppleDatePicker value={form.startDate ?? ""} onChange={(v) => setForm({ ...form, startDate: v })} placeholder="Start date" />
            <AppleDatePicker value={form.endDate ?? ""} onChange={(v) => setForm({ ...form, endDate: v })} placeholder="End date" />
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
            <p className="text-xs text-text-secondary sm:col-span-2">
              Trip segments, budget, ticket requests and the settlement can all be filled in after creating the trip.
            </p>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {loading && <div className="flex items-center gap-2 text-sm text-text-secondary"><Spinner size={16} /> Loading…</div>}
          {!loading && trips.length === 0 && <p className="text-sm text-text-secondary">No trips yet.</p>}
          {trips.map((t) => (
            <motion.div key={t.id} whileHover={{ y: -2 }}>
              <Card
                onClick={() => setSelectedId(t.id)}
                className={`cursor-pointer p-4 ${selectedId === t.id ? "ring-2 ring-primary" : ""}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t.category}</Badge>
                    <span className="truncate text-[15px] font-semibold">{t.destination || "Untitled trip"}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    <Badge variant={TRIP_STATUS_VARIANT[t.status]} dot={t.status === "Submitted"}>
                      {STATUS_LABEL[t.status]}
                    </Badge>
                    <span>{t.tripNumber}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{t.startDate} → {t.endDate}</p>
                  <p className="mt-1 truncate text-sm text-text-secondary">{t.purpose}</p>
                  {t.documentCount > 0 && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-text-secondary">
                      <FileText className="size-3" /> {t.documentCount} document{t.documentCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="min-h-[300px]">
          {!selected || !appForm ? (
            <CardContent className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 text-center text-text-secondary">
              <Briefcase className="size-10 opacity-40" />
              <p>Select a trip to manage its application, settlement and documents.</p>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-text-secondary">{selected.tripNumber}</p>
                  <h3 className="text-lg font-semibold">{selected.destination || "Untitled trip"}</h3>
                  <p className="text-sm text-text-secondary">{selected.purpose}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <AppleSelect
                    className="w-32"
                    value={selected.status}
                    onChange={(v) => handleStatusChange(selected, v)}
                    options={STATUS_OPTIONS}
                  />
                  <Button size="sm" variant="outline" onClick={() => handleExport("xlsx")} disabled={exporting}>
                    {exporting ? <Spinner size={14} /> : <Download className="size-3.5" />} Export
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport("html")} disabled={exporting}>
                    HTML
                  </Button>
                  <ShareButton resourceType="TripReport" resourceId={selected.id} title={selected.destination || selected.tripNumber} size="sm" />
                </div>
              </div>

              {/* ===== APPLICATION ===== */}
              <section className="flex flex-col gap-3 rounded-2xl border border-separator bg-background/30 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Application</h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-text-secondary">
                    Category
                    <AppleSelect
                      value={appForm.category}
                      onChange={() => {}}
                      options={CATEGORY_OPTIONS}
                      disabled
                      title="Category can't be changed after the trip is created — delete and recreate it if you picked the wrong one."
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-secondary">
                    Department code
                    <Input
                      className="h-9 text-sm"
                      inputMode="numeric"
                      value={appForm.departmentCode}
                      onChange={(e) => setAppForm({ ...appForm, departmentCode: e.target.value.replace(/\D/g, "") })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-secondary">
                    Destination
                    <Input className="h-9 text-sm" value={appForm.destination} onChange={(e) => setAppForm({ ...appForm, destination: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-secondary">
                    Purpose
                    <Input className="h-9 text-sm" value={appForm.purpose} onChange={(e) => setAppForm({ ...appForm, purpose: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-secondary">
                    Start date
                    <AppleDatePicker value={appForm.startDate} onChange={(v) => setAppForm({ ...appForm, startDate: v })} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-secondary">
                    End date
                    <AppleDatePicker value={appForm.endDate} onChange={(v) => setAppForm({ ...appForm, endDate: v })} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-secondary">
                    Scheduled departure
                    <div className="flex flex-col gap-1.5">
                      <AppleDatePicker
                        value={splitDateTime(appForm.scheduledDeparture).date}
                        onChange={(v) => setAppForm({ ...appForm, scheduledDeparture: combineDateTime(v, splitDateTime(appForm.scheduledDeparture).time) })}
                      />
                      <AppleTimePicker
                        value={splitDateTime(appForm.scheduledDeparture).time}
                        onChange={(v) => setAppForm({ ...appForm, scheduledDeparture: combineDateTime(splitDateTime(appForm.scheduledDeparture).date, v) })}
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-text-secondary">
                    Scheduled return
                    <div className="flex flex-col gap-1.5">
                      <AppleDatePicker
                        value={splitDateTime(appForm.scheduledReturn).date}
                        onChange={(v) => setAppForm({ ...appForm, scheduledReturn: combineDateTime(v, splitDateTime(appForm.scheduledReturn).time) })}
                      />
                      <AppleTimePicker
                        value={splitDateTime(appForm.scheduledReturn).time}
                        onChange={(v) => setAppForm({ ...appForm, scheduledReturn: combineDateTime(splitDateTime(appForm.scheduledReturn).date, v) })}
                      />
                    </div>
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs text-text-secondary">
                  Notes
                  <Textarea className="text-sm" value={appForm.notes} onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })} />
                </label>

                {/* Trip Details / segments */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Trip Details</p>
                    <Button type="button" size="sm" variant="outline" onClick={addSegment}>
                      <Plus className="size-3.5" /> Add segment
                    </Button>
                  </div>
                  {appForm.segments.length === 0 && <p className="text-xs text-text-secondary">No segments — add one for each destination/leg of this trip.</p>}
                  {appForm.segments.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] border-collapse text-xs">
                        <thead>
                          <tr className="text-left text-text-secondary">
                            <th className="p-1">Purpose</th>
                            <th className="p-1">Content</th>
                            <th className="p-1">Project No.</th>
                            <th className="p-1">Destination</th>
                            <th className="p-1">Place</th>
                            <th className="p-1">Date 1</th>
                            <th className="p-1">Date 2</th>
                            <th className="p-1"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {appForm.segments.map((s) => (
                            <tr key={s.id}>
                              <td className="p-1"><input className={inputCls()} value={s.purpose} onChange={(e) => updateSegment(s.id, { purpose: e.target.value })} /></td>
                              <td className="p-1"><input className={inputCls()} value={s.content} onChange={(e) => updateSegment(s.id, { content: e.target.value })} /></td>
                              <td className="p-1"><input className={inputCls()} value={s.projectNo} onChange={(e) => updateSegment(s.id, { projectNo: e.target.value })} /></td>
                              <td className="p-1"><input className={inputCls()} value={s.destinationName} onChange={(e) => updateSegment(s.id, { destinationName: e.target.value })} /></td>
                              <td className="p-1"><input className={inputCls()} value={s.placeName} onChange={(e) => updateSegment(s.id, { placeName: e.target.value })} /></td>
                              <td className="p-1"><AppleDatePicker size="sm" value={s.date1 ?? ""} onChange={(v) => updateSegment(s.id, { date1: v || null })} /></td>
                              <td className="p-1"><AppleDatePicker size="sm" value={s.date2 ?? ""} onChange={(v) => updateSegment(s.id, { date2: v || null })} /></td>
                              <td className="p-1"><button type="button" onClick={() => removeSegment(s.id)} className="cursor-pointer text-text-secondary hover:text-destructive"><X className="size-3.5" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Budget */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Budget</p>
                    <Button type="button" size="sm" variant="outline" onClick={addBudgetLine}>
                      <Plus className="size-3.5" /> Add line
                    </Button>
                  </div>
                  {appForm.budgetLines.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[420px] border-collapse text-xs">
                        <thead>
                          <tr className="text-left text-text-secondary">
                            <th className="p-1">Content</th>
                            <th className="p-1">Expense category</th>
                            <th className="p-1">Amount</th>
                            <th className="p-1"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {appForm.budgetLines.map((b) => (
                            <tr key={b.id}>
                              <td className="p-1"><input className={inputCls()} value={b.content} onChange={(e) => updateBudgetLine(b.id, { content: e.target.value })} /></td>
                              <td className="p-1"><input className={inputCls()} value={b.expenseCategory} onChange={(e) => updateBudgetLine(b.id, { expenseCategory: e.target.value })} /></td>
                              <td className="p-1"><input type="number" className={inputCls("w-24")} value={b.amount} onChange={(e) => updateBudgetLine(b.id, { amount: Number(e.target.value) })} /></td>
                              <td className="p-1"><button type="button" onClick={() => removeBudgetLine(b.id)} className="cursor-pointer text-text-secondary hover:text-destructive"><X className="size-3.5" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-1 text-right text-xs font-semibold">Budget total: {budgetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  )}
                </div>

                <label className="flex flex-col gap-1 text-xs text-text-secondary">
                  Ticket arrangement request
                  <Textarea className="text-sm" value={appForm.ticketArrangementRequest} onChange={(e) => setAppForm({ ...appForm, ticketArrangementRequest: e.target.value })} />
                </label>

                {appError && <p className="text-xs text-destructive">{appError}</p>}
                <div>
                  <Button type="button" size="sm" onClick={handleSaveApplication} disabled={savingApp}>
                    {savingApp ? <Spinner size={14} /> : <Save className="size-3.5" />} Save Application
                  </Button>
                </div>
              </section>

              {/* ===== SETTLEMENT ===== */}
              {settlement && (
                <section className="flex flex-col gap-3 rounded-2xl border border-separator bg-background/30 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Settlement</h4>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      Employee No.
                      <Input className="h-9 text-sm" value={settlement.employeeNo} onChange={(e) => setSettlement({ ...settlement, employeeNo: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      Bank account number
                      <Input className="h-9 text-sm" value={settlement.bankAccountNumber} onChange={(e) => setSettlement({ ...settlement, bankAccountNumber: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      Bank
                      <Input className="h-9 text-sm" value={settlement.bank} onChange={(e) => setSettlement({ ...settlement, bank: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      Branch
                      <Input className="h-9 text-sm" value={settlement.branch} onChange={(e) => setSettlement({ ...settlement, branch: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      Location at settlement
                      <Input className="h-9 text-sm" value={settlement.locationAtSettlement} onChange={(e) => setSettlement({ ...settlement, locationAtSettlement: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      Region
                      <Input className="h-9 text-sm" value={settlement.region} onChange={(e) => setSettlement({ ...settlement, region: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      Accounting code
                      <Input className="h-9 text-sm" value={settlement.accountingCode} onChange={(e) => setSettlement({ ...settlement, accountingCode: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      Source document No.
                      <Input className="h-9 text-sm" value={settlement.sourceDocumentNo} onChange={(e) => setSettlement({ ...settlement, sourceDocumentNo: e.target.value })} />
                    </label>
                  </div>

                  {/* Transportation */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Travel &amp; Transportation Expenses</p>
                      <Button type="button" size="sm" variant="outline" onClick={addTransportLine}>
                        <Plus className="size-3.5" /> Add row
                      </Button>
                    </div>
                    {settlement.transportationLines.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] border-collapse text-xs">
                          <thead>
                            <tr className="text-left text-text-secondary">
                              <th className="p-1">Date</th>
                              <th className="p-1">Content</th>
                              <th className="p-1">Destination</th>
                              <th className="p-1">Place</th>
                              <th className="p-1">Route</th>
                              <th className="p-1">Mode</th>
                              <th className="p-1">Depart</th>
                              <th className="p-1">Arrive</th>
                              <th className="p-1">Gas</th>
                              <th className="p-1">Toll</th>
                              <th className="p-1">Transport</th>
                              <th className="p-1">Lodging</th>
                              <th className="p-1">Daily</th>
                              <th className="p-1"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {settlement.transportationLines.map((l) => (
                              <tr key={l.id}>
                                <td className="p-1"><AppleDatePicker size="sm" value={l.date ?? ""} onChange={(v) => updateTransportLine(l.id, { date: v || null })} /></td>
                                <td className="p-1"><input className={inputCls()} value={l.content} onChange={(e) => updateTransportLine(l.id, { content: e.target.value })} /></td>
                                <td className="p-1"><input className={inputCls()} value={l.destinationName} onChange={(e) => updateTransportLine(l.id, { destinationName: e.target.value })} /></td>
                                <td className="p-1"><input className={inputCls()} value={l.placeName} onChange={(e) => updateTransportLine(l.id, { placeName: e.target.value })} /></td>
                                <td className="p-1"><input className={inputCls()} value={l.route} onChange={(e) => updateTransportLine(l.id, { route: e.target.value })} /></td>
                                <td className="p-1"><input className={inputCls()} value={l.transportMode} onChange={(e) => updateTransportLine(l.id, { transportMode: e.target.value })} /></td>
                                <td className="p-1"><AppleTimePicker size="sm" value={l.departureTime} onChange={(v) => updateTransportLine(l.id, { departureTime: v })} /></td>
                                <td className="p-1"><AppleTimePicker size="sm" value={l.arrivalTime} onChange={(v) => updateTransportLine(l.id, { arrivalTime: v })} /></td>
                                <td className="p-1"><input type="number" className={inputCls("w-16")} value={l.gasCost ?? ""} onChange={(e) => updateTransportLine(l.id, { gasCost: e.target.value ? Number(e.target.value) : null })} /></td>
                                <td className="p-1"><input type="number" className={inputCls("w-16")} value={l.tollCost ?? ""} onChange={(e) => updateTransportLine(l.id, { tollCost: e.target.value ? Number(e.target.value) : null })} /></td>
                                <td className="p-1"><input type="number" className={inputCls("w-20")} value={l.transportationCost} onChange={(e) => updateTransportLine(l.id, { transportationCost: Number(e.target.value) })} /></td>
                                <td className="p-1"><input type="number" className={inputCls("w-20")} value={l.lodgingCost} onChange={(e) => updateTransportLine(l.id, { lodgingCost: Number(e.target.value) })} /></td>
                                <td className="p-1"><input type="number" className={inputCls("w-20")} value={l.dailyAllowance} onChange={(e) => updateTransportLine(l.id, { dailyAllowance: Number(e.target.value) })} /></td>
                                <td className="p-1"><button type="button" onClick={() => removeTransportLine(l.id)} className="cursor-pointer text-text-secondary hover:text-destructive"><X className="size-3.5" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Other */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Other Settlement</p>
                      <Button type="button" size="sm" variant="outline" onClick={addOtherLine}>
                        <Plus className="size-3.5" /> Add row
                      </Button>
                    </div>
                    {settlement.otherLines.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-xs">
                          <thead>
                            <tr className="text-left text-text-secondary">
                              <th className="p-1">Date</th>
                              <th className="p-1">Content</th>
                              <th className="p-1">Description</th>
                              <th className="p-1">Dept. code</th>
                              <th className="p-1">Expense/tax code</th>
                              <th className="p-1">Amount</th>
                              <th className="p-1"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {settlement.otherLines.map((l) => (
                              <tr key={l.id}>
                                <td className="p-1"><AppleDatePicker size="sm" value={l.date ?? ""} onChange={(v) => updateOtherLine(l.id, { date: v || null })} /></td>
                                <td className="p-1"><input className={inputCls()} value={l.content} onChange={(e) => updateOtherLine(l.id, { content: e.target.value })} /></td>
                                <td className="p-1"><input className={inputCls()} value={l.description} onChange={(e) => updateOtherLine(l.id, { description: e.target.value })} /></td>
                                <td className="p-1"><input inputMode="numeric" className={inputCls()} value={l.departmentCode} onChange={(e) => updateOtherLine(l.id, { departmentCode: e.target.value.replace(/\D/g, "") })} /></td>
                                <td className="p-1"><input className={inputCls()} value={l.expenseCategoryTaxCode} onChange={(e) => updateOtherLine(l.id, { expenseCategoryTaxCode: e.target.value })} /></td>
                                <td className="p-1"><input type="number" className={inputCls("w-24")} value={l.settlementAmount} onChange={(e) => updateOtherLine(l.id, { settlementAmount: Number(e.target.value) })} /></td>
                                <td className="p-1"><button type="button" onClick={() => removeOtherLine(l.id)} className="cursor-pointer text-text-secondary hover:text-destructive"><X className="size-3.5" /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <p className="text-right text-sm font-semibold">
                    Settlement total: {settlementTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>

                  <div>
                    <Button type="button" size="sm" onClick={handleSaveSettlement} disabled={savingSettlement}>
                      {savingSettlement ? <Spinner size={14} /> : <Save className="size-3.5" />} Save Settlement
                    </Button>
                  </div>

                  {/* Receipts / documents */}
                  <div className="flex flex-col gap-2 border-t border-separator pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Receipts ({docs.length})</p>
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-separator bg-background/40 p-3">
                      <CategoryPicker value={docCategory} onChange={setDocCategory} className="h-9 w-40" placeholder="Category" />
                      <AppleDatePicker value={docDate} onChange={setDocDate} className="w-36" placeholder="Document date" />
                      <Input placeholder="Label (optional)" value={docLabel} onChange={(e) => setDocLabel(e.target.value)} className="h-9 flex-1" />
                      <Input type="number" placeholder="Amount" value={docAmount} onChange={(e) => setDocAmount(e.target.value)} className="h-9 w-24" title="Expense amount (optional)" />
                      <AppleSelect value={docCurrency} onChange={setDocCurrency} options={CURRENCY_OPTIONS} className="w-24" />
                      <FileDropZone
                        onFile={handleFile}
                        disabled={uploading || !docCategory}
                        className={cn(
                          "inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-separator bg-fill-1 px-3 text-xs font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md hover:bg-fill-1",
                          (uploading || !docCategory) && "pointer-events-none cursor-not-allowed opacity-50"
                        )}
                      >
                        {uploading ? <Spinner size={14} /> : <Upload className="size-3.5" />} {uploading ? "Uploading…" : "Upload or drop a file"}
                      </FileDropZone>
                    </div>

                    {docs.some((d) => d.amount != null) && (
                      <p className="text-right text-sm font-semibold">
                        Receipts total: {docs.filter((d) => d.amount != null).reduce((sum, d) => sum + (d.amount ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                        {docs.find((d) => d.amount != null)?.currency}
                      </p>
                    )}

                    <div className="flex flex-col gap-2">
                      {docs.length === 0 && <p className="text-sm text-text-secondary">No receipts yet.</p>}
                      {docs.map((d) => (
                        <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-separator bg-background/30 px-3 py-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{d.category}</Badge>
                              <span className="truncate text-sm font-medium">{d.fileName}</span>
                              {d.amount != null && (
                                <span className="text-xs font-medium text-text-secondary">
                                  {d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {d.currency}
                                </span>
                              )}
                              {d.resourceId && resourceTitles[d.resourceId] && (
                                <ResourceLinkChip resource={{ id: d.resourceId, title: resourceTitles[d.resourceId] }} onRemove={() => handleUnlinkResource(d.id)} />
                              )}
                            </div>
                            {d.label && <p className="text-xs text-text-secondary">{d.label}</p>}
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
                  </div>
                </section>
              )}
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
          const guarded = target?.status === "Approved" || target?.status === "Settled";
          return (
            <ConfirmDialog
              title="Delete this trip?"
              description={
                deleteError
                  ? deleteError
                  : guarded
                    ? `${target?.destination} is ${target?.status} — deleting it removes its settlement and ${target?.documentCount} document${target?.documentCount === 1 ? "" : "s"} too. Are you sure?`
                    : target
                      ? `${target.destination} and its ${target.documentCount} document${target.documentCount === 1 ? "" : "s"} will be permanently removed.`
                      : "This trip will be permanently removed."
              }
              confirmLabel="Delete"
              cancelLabel="Cancel"
              onConfirm={() => {
                handleDeleteTrip(confirmDeleteTripId);
                setConfirmDeleteTripId(null);
              }}
              onCancel={() => {
                setConfirmDeleteTripId(null);
                setDeleteError(null);
              }}
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
