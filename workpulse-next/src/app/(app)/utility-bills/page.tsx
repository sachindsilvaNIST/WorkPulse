"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AppleSelect } from "@/components/ui/apple-select";
import { AppleDatePicker } from "@/components/ui/apple-date-picker";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconBadge } from "@/components/ui/icon-badge";
import { UtilityBillsGlyph } from "@/components/ui/nav-glyphs";
import { PageToolbar } from "@/components/shell/page-toolbar";
import { Spinner } from "@/components/ui/spinner";
import { utilityBillsApi, downloadBlob, ApiError } from "@/lib/api/client";
import type {
  UtilityBill,
  UtilityBillDocumentMeta,
  UtilityBillMonthlyChartPoint,
  UtilityBillStatus,
  UtilityBillSummary,
  UtilityBillUsageChartPoint,
  UtilityPaymentMethod,
  UtilityProvider,
  UtilityProviderSettings,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

const PROVIDER_LABEL: Record<UtilityProvider, string> = { TokyoGas: "Tokyo Gas", TokyoWater: "Tokyo Water" };
const PROVIDER_COLOR: Record<UtilityProvider, string> = { TokyoGas: "var(--brand-orange)", TokyoWater: "var(--brand-blue)" };
const PROVIDER_OPTIONS: { value: UtilityProvider; label: string }[] = [
  { value: "TokyoGas", label: PROVIDER_LABEL.TokyoGas },
  { value: "TokyoWater", label: PROVIDER_LABEL.TokyoWater },
];

const STATUS_COLOR: Record<UtilityBillStatus, string> = {
  Unpaid: "#8E8E93",
  Paid: "var(--brand-green)",
  Overdue: "var(--destructive)",
};

const PAYMENT_LABEL: Record<UtilityPaymentMethod, string> = {
  PaperSlipConvenienceStore: "Paper slip — convenience store",
  PaperSlipBank: "Paper slip — bank",
  SmartphoneApp: "Smartphone app (PayPay / d払い / au PAY)",
  CreditCard: "Credit card",
  WaterworksApp: "Waterworks app",
  DirectDebit: "Direct debit",
};
const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Not set" },
  ...(Object.keys(PAYMENT_LABEL) as UtilityPaymentMethod[]).map((value) => ({ value, label: PAYMENT_LABEL[value] })),
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(Date.UTC(2000, i, 1)).toLocaleString("en", { month: "long", timeZone: "UTC" }),
}));

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "Unpaid", label: "Unpaid" },
  { value: "Paid", label: "Paid" },
  { value: "Overdue", label: "Overdue" },
];

/** Today's date in Asia/Tokyo as YYYY-MM-DD — the same zone the server uses for overdue status. */
function todayJst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** The trailing `count` months ending at the current Tokyo month, oldest first. */
function recentMonthKeys(count: number): string[] {
  const [y, m] = todayJst().split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
  });
}

const yen = (value: number) => `¥${Math.round(value).toLocaleString("ja-JP")}`;

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight" style={{ color }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 text-xs text-muted-foreground", className)}>
      {label}
      {children}
    </div>
  );
}

type BillDraft = {
  provider: UtilityProvider;
  billingYear: string;
  billingMonth: string;
  amountJpy: string;
  dueDate: string;
  paidDate: string;
  paymentMethod: string;
  meterReadingDate: string;
  periodStart: string;
  periodEnd: string;
  usageAmount: string;
  sewerUsageAmount: string;
  waterCharge: string;
  sewerCharge: string;
  consumptionTax: string;
  slipIssuingFee: string;
  lateInterest: string;
  receiptRef: string;
  notes: string;
};

function emptyDraft(provider: UtilityProvider = "TokyoGas"): BillDraft {
  const [y, m] = todayJst().split("-").map(Number);
  return {
    provider,
    billingYear: String(y),
    billingMonth: String(m),
    amountJpy: "",
    dueDate: "",
    paidDate: "",
    paymentMethod: "",
    meterReadingDate: "",
    periodStart: "",
    periodEnd: "",
    usageAmount: "",
    sewerUsageAmount: "",
    waterCharge: "",
    sewerCharge: "",
    consumptionTax: "",
    slipIssuingFee: "",
    lateInterest: "",
    receiptRef: "",
    notes: "",
  };
}

const numStr = (v?: number | null) => (v != null ? String(v) : "");
const optNum = (s: string): number | null => (s.trim() === "" ? null : Number(s));
const optDate = (s: string): string | null => (s === "" ? null : s);

function draftFromBill(b: UtilityBill): BillDraft {
  return {
    provider: b.provider,
    billingYear: String(b.billingYear),
    billingMonth: String(b.billingMonth),
    amountJpy: String(b.amountJpy),
    dueDate: b.dueDate,
    paidDate: b.paidDate ?? "",
    paymentMethod: b.paymentMethod ?? "",
    meterReadingDate: b.meterReadingDate ?? "",
    periodStart: b.periodStart ?? "",
    periodEnd: b.periodEnd ?? "",
    usageAmount: numStr(b.usageAmount),
    sewerUsageAmount: numStr(b.sewerUsageAmount),
    waterCharge: numStr(b.breakdown?.waterCharge),
    sewerCharge: numStr(b.breakdown?.sewerCharge),
    consumptionTax: numStr(b.breakdown?.consumptionTax),
    slipIssuingFee: numStr(b.breakdown?.slipIssuingFee),
    lateInterest: numStr(b.breakdown?.lateInterest),
    receiptRef: b.receiptRef ?? "",
    notes: b.notes,
  };
}

function validateDraft(d: BillDraft): string | null {
  const amount = Number(d.amountJpy);
  if (d.amountJpy.trim() === "" || !Number.isFinite(amount) || amount <= 0) return "Amount must be greater than zero.";
  if (!d.dueDate) return "Due date is required.";
  if (d.paidDate && d.periodStart && d.paidDate < d.periodStart) return "Paid date can't be before the period start.";
  return null;
}

function billFromDraft(d: BillDraft): Partial<UtilityBill> {
  const breakdown = {
    waterCharge: optNum(d.waterCharge),
    sewerCharge: optNum(d.sewerCharge),
    consumptionTax: optNum(d.consumptionTax),
    slipIssuingFee: optNum(d.slipIssuingFee),
    lateInterest: optNum(d.lateInterest),
  };
  const hasBreakdown = Object.values(breakdown).some((v) => v != null);
  return {
    provider: d.provider,
    billingYear: Number(d.billingYear),
    billingMonth: Number(d.billingMonth),
    amountJpy: Math.round(Number(d.amountJpy)),
    dueDate: d.dueDate,
    paidDate: optDate(d.paidDate),
    paymentMethod: (d.paymentMethod || null) as UtilityPaymentMethod | null,
    meterReadingDate: optDate(d.meterReadingDate),
    periodStart: optDate(d.periodStart),
    periodEnd: optDate(d.periodEnd),
    usageAmount: optNum(d.usageAmount),
    usageUnit: "m³",
    sewerUsageAmount: d.provider === "TokyoWater" ? optNum(d.sewerUsageAmount) : null,
    breakdown: hasBreakdown ? breakdown : null,
    receiptRef: d.receiptRef.trim() || null,
    notes: d.notes,
  };
}

const NO_SETTINGS: UtilityProviderSettings[] = [];
const NO_MONTHLY: UtilityBillMonthlyChartPoint[] = [];
const NO_USAGE: UtilityBillUsageChartPoint[] = [];

type FormState = { mode: "closed" | "new" | "edit"; billId: string | null; draft: BillDraft };

type BillData = {
  bills: UtilityBill[];
  summary: UtilityBillSummary;
  providerSettings: UtilityProviderSettings[];
  monthly: UtilityBillMonthlyChartPoint[];
  usage: UtilityBillUsageChartPoint[];
  yoy: UtilityBillMonthlyChartPoint[];
};

async function fetchBillData(spreadBimonthly: boolean, yoyMonth: number): Promise<BillData> {
  const [bills, summary, providerSettings, monthly, usage, yoy] = await Promise.all([
    utilityBillsApi.getAll(),
    utilityBillsApi.getSummary(),
    utilityBillsApi.getProviderSettings(),
    utilityBillsApi.getMonthlyChart(12, spreadBimonthly),
    utilityBillsApi.getUsageChart(12),
    utilityBillsApi.getYearOverYear(yoyMonth),
  ]);
  return { bills, summary, providerSettings, monthly, usage, yoy };
}

export default function UtilityBillsPage() {
  const [data, setData] = useState<BillData | null>(null);
  const bills = data?.bills ?? null;
  const summary = data?.summary ?? null;
  const providerSettings = data?.providerSettings ?? NO_SETTINGS;
  const monthly = data?.monthly ?? NO_MONTHLY;
  const usage = data?.usage ?? NO_USAGE;
  const yoy = data?.yoy ?? NO_MONTHLY;
  const [spreadBimonthly, setSpreadBimonthly] = useState(false);
  const [yoyMonth, setYoyMonth] = useState(() => Number(todayJst().split("-")[1]));
  const [pageError, setPageError] = useState<string | null>(null);

  const [filterProvider, setFilterProvider] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortAscending, setSortAscending] = useState(false);

  const [form, setForm] = useState<FormState>({ mode: "closed", billId: null, draft: emptyDraft() });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<UtilityBillDocumentMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UtilityBill | null>(null);

  const reloadAll = useCallback(async () => {
    try {
      setData(await fetchBillData(spreadBimonthly, yoyMonth));
      setPageError(null);
    } catch (e) {
      setPageError(e instanceof ApiError ? e.message : "Couldn't load utility bills.");
    }
  }, [spreadBimonthly, yoyMonth]);

  useEffect(() => {
    let cancelled = false;
    fetchBillData(spreadBimonthly, yoyMonth)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setPageError(null);
      })
      .catch((e) => {
        if (!cancelled) setPageError(e instanceof ApiError ? e.message : "Couldn't load utility bills.");
      });
    return () => {
      cancelled = true;
    };
  }, [spreadBimonthly, yoyMonth]);

  useEffect(() => {
    if (form.mode !== "edit" || !form.billId) return;
    let cancelled = false;
    utilityBillsApi
      .getDocuments(form.billId)
      .then((list) => {
        if (!cancelled) setDocs(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [form.mode, form.billId]);

  const today = todayJst();

  const visibleBills = useMemo(() => {
    if (!bills) return [];
    return bills
      .filter((b) => !filterProvider || b.provider === filterProvider)
      .filter((b) => !filterYear || String(b.billingYear) === filterYear)
      .filter((b) => !filterStatus || b.status === filterStatus)
      .sort((a, b) => (sortAscending ? 1 : -1) * a.dueDate.localeCompare(b.dueDate));
  }, [bills, filterProvider, filterYear, filterStatus, sortAscending]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([Number(today.slice(0, 4)), ...(bills ?? []).map((b) => b.billingYear)]);
    return [
      { value: "", label: "All years" },
      ...[...years].sort((a, b) => b - a).map((y) => ({ value: String(y), label: String(y) })),
    ];
  }, [bills, today]);

  const reminders = useMemo(
    () =>
      (bills ?? []).filter(
        (b) => b.status !== "Paid" && (b.status === "Overdue" || daysBetween(today, b.dueDate) <= 3)
      ),
    [bills, today]
  );

  const monthlyRows = useMemo(() => {
    const map = new Map<string, { label: string; TokyoGas: number; TokyoWater: number }>();
    for (const key of recentMonthKeys(12)) map.set(key, { label: key, TokyoGas: 0, TokyoWater: 0 });
    for (const p of monthly) {
      const key = monthKey(p.year, p.month);
      const row = map.get(key) ?? { label: key, TokyoGas: 0, TokyoWater: 0 };
      row[p.provider] += p.amount;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [monthly]);

  const usageRows = useMemo(() => {
    const map = new Map<string, { label: string; TokyoGas?: number; TokyoWater?: number }>();
    for (const key of recentMonthKeys(12)) map.set(key, { label: key });
    for (const p of usage) {
      const key = monthKey(p.year, p.month);
      const row = map.get(key) ?? { label: key };
      row[p.provider] = (row[p.provider] ?? 0) + p.usage;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [usage]);

  const yoyRows = useMemo(() => {
    const map = new Map<number, { year: string; TokyoGas: number; TokyoWater: number }>();
    for (const p of yoy) {
      const row = map.get(p.year) ?? { year: String(p.year), TokyoGas: 0, TokyoWater: 0 };
      row[p.provider] += p.amount;
      map.set(p.year, row);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row);
  }, [yoy]);

  const chartTooltipStyle = {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--card)",
    fontSize: 12,
  };

  function setField<K extends keyof BillDraft>(key: K, value: BillDraft[K]) {
    setForm((f) => ({ ...f, draft: { ...f.draft, [key]: value } as BillDraft }));
  }

  function openNew() {
    setForm({ mode: "new", billId: null, draft: emptyDraft() });
    setDocs([]);
    setFormError(null);
  }

  function openEdit(bill: UtilityBill) {
    setForm({ mode: "edit", billId: bill.id, draft: draftFromBill(bill) });
    setFormError(null);
  }

  function closeForm() {
    setForm((f) => ({ ...f, mode: "closed" }));
    setDocs([]);
    setFormError(null);
  }

  async function handleSave() {
    const error = validateDraft(form.draft);
    if (error) {
      setFormError(error);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = billFromDraft(form.draft);
      if (form.mode === "edit" && form.billId) await utilityBillsApi.update(form.billId, payload);
      else await utilityBillsApi.create(payload);
      closeForm();
      await reloadAll();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Couldn't save the bill.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(bill: UtilityBill) {
    const method = providerSettings.find((s) => s.provider === bill.provider)?.currentPaymentMethod ?? null;
    try {
      await utilityBillsApi.markPaid(bill.id, todayJst(), method);
      await reloadAll();
    } catch (e) {
      setPageError(e instanceof ApiError ? e.message : "Couldn't mark the bill as paid.");
    }
  }

  async function handleDelete(bill: UtilityBill) {
    try {
      await utilityBillsApi.delete(bill.id);
      setConfirmDelete(null);
      if (form.billId === bill.id) closeForm();
      await reloadAll();
    } catch (e) {
      setPageError(e instanceof ApiError ? e.message : "Couldn't delete the bill.");
    }
  }

  async function handleUpload(file: File) {
    if (!form.billId) return;
    setUploading(true);
    setFormError(null);
    try {
      const meta = await utilityBillsApi.uploadDocument(form.billId, file);
      setDocs((prev) => [meta, ...prev]);
      await reloadAll();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownloadDoc(doc: UtilityBillDocumentMeta) {
    if (!form.billId) return;
    try {
      const { blob, fileName } = await utilityBillsApi.downloadDocument(form.billId, doc.id);
      downloadBlob(blob, fileName || doc.fileName);
    } catch {
      setFormError("Couldn't download that file.");
    }
  }

  async function handleDeleteDoc(doc: UtilityBillDocumentMeta) {
    if (!form.billId) return;
    try {
      await utilityBillsApi.deleteDocument(form.billId, doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      await reloadAll();
    } catch {
      setFormError("Couldn't delete that file.");
    }
  }

  const isWater = form.draft.provider === "TokyoWater";

  return (
    <div className="mx-auto max-w-6xl">
      <PageToolbar
        title="Utility Bills"
        description="Tokyo Gas and Tokyo Water — what you owe, what's paid, and how usage trends"
        icon={<IconBadge icon={UtilityBillsGlyph} color="#FFB340" color2="#FF9500" flat size="size-11" iconSize="size-6" />}
      >
        <Button onClick={() => (form.mode === "closed" ? openNew() : closeForm())}>
          <Plus className="size-4" /> New Bill
        </Button>
      </PageToolbar>

      {pageError && <p className="mb-4 text-sm text-destructive">{pageError}</p>}

      {reminders.length > 0 && (
        <Card className="mb-6 border-destructive/30 p-4">
          <p className="mb-2 text-sm font-semibold">Needs attention</p>
          <ul className="flex flex-col gap-1 text-sm">
            {reminders.map((b) => {
              const days = daysBetween(today, b.dueDate);
              const text =
                b.status === "Overdue"
                  ? `overdue since ${b.dueDate}`
                  : days === 0
                    ? "due today"
                    : `due in ${days} day${days === 1 ? "" : "s"} (${b.dueDate})`;
              return (
                <li key={b.id} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[b.status] }} />
                  <span className="font-medium">{PROVIDER_LABEL[b.provider]}</span>
                  <span className="text-muted-foreground">
                    {b.billingYear}-{String(b.billingMonth).padStart(2, "0")} · {yen(b.amountJpy)} · {text}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Paid this month" value={yen(summary?.totalThisMonth ?? 0)} color="var(--brand-green)" />
        <StatCard label="Paid year to date" value={yen(summary?.yearToDate ?? 0)} color="var(--brand-blue)" />
        <StatCard label="Monthly average (YTD)" value={yen(summary?.monthlyAverage ?? 0)} color="var(--brand-purple)" />
        <StatCard
          label="Unpaid"
          value={String(summary?.unpaidCount ?? 0)}
          sub={
            summary?.nextDueBill
              ? `${summary.overdueCount} overdue · next due ${summary.nextDueBill.dueDate}`
              : `${summary?.overdueCount ?? 0} overdue`
          }
          color={(summary?.overdueCount ?? 0) > 0 ? "var(--destructive)" : "var(--brand-orange)"}
        />
      </div>

      {form.mode !== "closed" && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{form.mode === "edit" ? "Edit bill" : "New bill"}</h2>
            </div>

            <form
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
              }}
            >
              <Field label="Provider">
                <AppleSelect<UtilityProvider>
                  value={form.draft.provider}
                  onChange={(v) => setField("provider", v)}
                  options={PROVIDER_OPTIONS}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Billing year">
                  <Input type="number" value={form.draft.billingYear} onChange={(e) => setField("billingYear", e.target.value)} />
                </Field>
                <Field label="Billing month">
                  <AppleSelect value={form.draft.billingMonth} onChange={(v) => setField("billingMonth", v)} options={MONTH_OPTIONS} />
                </Field>
              </div>
              <Field label="Amount (¥, tax included)">
                <Input type="number" min={1} value={form.draft.amountJpy} onChange={(e) => setField("amountJpy", e.target.value)} />
              </Field>
              <Field label="Due date (支払期限)">
                <AppleDatePicker value={form.draft.dueDate} onChange={(v) => setField("dueDate", v)} placeholder="Due date" />
              </Field>
              <Field label="Meter reading date (検針日)">
                <AppleDatePicker value={form.draft.meterReadingDate} onChange={(v) => setField("meterReadingDate", v)} placeholder="Optional" />
              </Field>
              <Field label={`Usage (${isWater ? "water" : "gas"}, m³)`}>
                <Input type="number" step="0.01" value={form.draft.usageAmount} onChange={(e) => setField("usageAmount", e.target.value)} />
              </Field>
              {isWater && (
                <>
                  <Field label="Sewer usage (m³)">
                    <Input type="number" step="0.01" value={form.draft.sewerUsageAmount} onChange={(e) => setField("sewerUsageAmount", e.target.value)} />
                  </Field>
                  <Field label="Period start">
                    <AppleDatePicker value={form.draft.periodStart} onChange={(v) => setField("periodStart", v)} placeholder="Period start" />
                  </Field>
                  <Field label="Period end">
                    <AppleDatePicker value={form.draft.periodEnd} onChange={(v) => setField("periodEnd", v)} placeholder="Period end" />
                  </Field>
                </>
              )}
              <Field label="Paid date (leave empty if unpaid)">
                <AppleDatePicker value={form.draft.paidDate} onChange={(v) => setField("paidDate", v)} placeholder="Not paid yet" />
              </Field>
              <Field label="Payment method">
                <AppleSelect value={form.draft.paymentMethod} onChange={(v) => setField("paymentMethod", v)} options={PAYMENT_OPTIONS} />
              </Field>
              <Field label="Receipt / 受付番号 (optional)">
                <Input value={form.draft.receiptRef} onChange={(e) => setField("receiptRef", e.target.value)} />
              </Field>

              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Breakdown (optional)</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Field label={isWater ? "Water charge" : "Gas charge"}>
                    <Input type="number" value={form.draft.waterCharge} onChange={(e) => setField("waterCharge", e.target.value)} />
                  </Field>
                  {isWater && (
                    <Field label="Sewer charge">
                      <Input type="number" value={form.draft.sewerCharge} onChange={(e) => setField("sewerCharge", e.target.value)} />
                    </Field>
                  )}
                  <Field label="Consumption tax">
                    <Input type="number" value={form.draft.consumptionTax} onChange={(e) => setField("consumptionTax", e.target.value)} />
                  </Field>
                  <Field label="Slip issuing fee">
                    <Input type="number" value={form.draft.slipIssuingFee} onChange={(e) => setField("slipIssuingFee", e.target.value)} />
                  </Field>
                  <Field label="Late interest">
                    <Input type="number" value={form.draft.lateInterest} onChange={(e) => setField("lateInterest", e.target.value)} />
                  </Field>
                </div>
              </div>

              <Field label="Notes" className="sm:col-span-2">
                <Textarea value={form.draft.notes} onChange={(e) => setField("notes", e.target.value)} />
              </Field>

              {formError && <p className="text-sm text-destructive sm:col-span-2">{formError}</p>}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : form.mode === "edit" ? "Save changes" : "Add bill"}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>

            {form.mode === "edit" && form.billId && (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <p className="text-sm font-semibold">Receipts</p>
                {docs.length === 0 && <p className="text-sm text-muted-foreground">No receipts attached yet.</p>}
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{doc.fileName}</span>
                    <Button variant="outline" size="icon" title="Download" onClick={() => void handleDownloadDoc(doc)}>
                      <Download className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon" title="Delete receipt" onClick={() => void handleDeleteDoc(doc)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <FileDropZone onFile={(file) => void handleUpload(file)} disabled={uploading} className="inline-flex w-fit">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm cursor-pointer hover:bg-foreground/5">
                    {uploading ? <Spinner size={14} /> : <Upload className="size-3.5" />} {uploading ? "Uploading…" : "Upload receipt (photo or PDF)"}
                  </span>
                </FileDropZone>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Provider" className="w-44">
              <AppleSelect
                value={filterProvider}
                onChange={setFilterProvider}
                options={[{ value: "", label: "All providers" }, ...PROVIDER_OPTIONS]}
              />
            </Field>
            <Field label="Year" className="w-36">
              <AppleSelect value={filterYear} onChange={setFilterYear} options={yearOptions} />
            </Field>
            <Field label="Status" className="w-40">
              <AppleSelect value={filterStatus} onChange={setFilterStatus} options={STATUS_FILTER_OPTIONS} />
            </Field>
          </div>

          {bills === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size={16} /> Loading…
            </div>
          ) : visibleBills.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {bills.length === 0 ? "No bills yet — add your first Tokyo Gas or Tokyo Water bill." : "No bills match these filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Provider</th>
                    <th className="pb-2 font-medium">Billing month</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                    <th className="pb-2 font-medium">
                      <button
                        type="button"
                        className="cursor-pointer hover:text-foreground"
                        onClick={() => setSortAscending((v) => !v)}
                      >
                        Due date {sortAscending ? "↑" : "↓"}
                      </button>
                    </th>
                    <th className="pb-2 font-medium">Paid</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBills.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ backgroundColor: PROVIDER_COLOR[b.provider] }} />
                          {PROVIDER_LABEL[b.provider]}
                        </span>
                      </td>
                      <td className="py-3">
                        {b.billingYear}-{String(b.billingMonth).padStart(2, "0")}
                      </td>
                      <td className="py-3 text-right font-medium tabular-nums">{yen(b.amountJpy)}</td>
                      <td className="py-3 tabular-nums">{b.dueDate}</td>
                      <td className="py-3 tabular-nums text-muted-foreground">{b.paidDate ?? "—"}</td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${STATUS_COLOR[b.status]} 15%, transparent)`,
                            borderColor: `color-mix(in srgb, ${STATUS_COLOR[b.status]} 35%, transparent)`,
                            color: STATUS_COLOR[b.status],
                          }}
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1.5">
                          {b.status !== "Paid" && (
                            <Button variant="outline" size="sm" onClick={() => void handleMarkPaid(b)}>
                              <CheckCircle2 className="size-3.5" /> Mark paid
                            </Button>
                          )}
                          <Button variant="outline" size="icon" title="Edit" onClick={() => openEdit(b)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="outline" size="icon" title="Delete" onClick={() => setConfirmDelete(b)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Monthly cost</h2>
                <p className="text-xs text-muted-foreground">Last 12 months, stacked by provider</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={spreadBimonthly} onCheckedChange={setSpreadBimonthly} />
                Spread bimonthly water bills evenly
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyRows}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={60} tickFormatter={(v) => yen(Number(v))} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => yen(Number(value))} />
                <Legend />
                <Bar dataKey="TokyoGas" name="Tokyo Gas" stackId="cost" fill={PROVIDER_COLOR.TokyoGas} />
                <Bar dataKey="TokyoWater" name="Tokyo Water" stackId="cost" fill={PROVIDER_COLOR.TokyoWater} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 className="font-semibold">Usage trend (m³)</h2>
              <p className="text-xs text-muted-foreground">Monthly usage per provider</p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={usageRows}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={40} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="TokyoGas" name="Tokyo Gas" stroke={PROVIDER_COLOR.TokyoGas} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="TokyoWater" name="Tokyo Water" stroke={PROVIDER_COLOR.TokyoWater} strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Year over year</h2>
                <p className="text-xs text-muted-foreground">Same billing month across years</p>
              </div>
              <div className="w-40">
                <AppleSelect value={String(yoyMonth)} onChange={(v) => setYoyMonth(Number(v))} options={MONTH_OPTIONS} />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={yoyRows}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={60} tickFormatter={(v) => yen(Number(v))} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => yen(Number(value))} />
                <Legend />
                <Bar dataKey="TokyoGas" name="Tokyo Gas" fill={PROVIDER_COLOR.TokyoGas} radius={[6, 6, 0, 0]} />
                <Bar dataKey="TokyoWater" name="Tokyo Water" fill={PROVIDER_COLOR.TokyoWater} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {bills !== null && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 className="font-semibold">Provider settings</h2>
              <p className="text-xs text-muted-foreground">
                Your customer number and how you pay. Bills recorded before a payment-method change keep whatever method you set on them.
              </p>
            </div>
            {PROVIDER_OPTIONS.map((o) => (
              <ProviderSettingsRow
                key={o.value}
                provider={o.value}
                initial={providerSettings.find((s) => s.provider === o.value)}
                onSaved={() => void reloadAll()}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this bill?"
          description={`${PROVIDER_LABEL[confirmDelete.provider]} · ${confirmDelete.billingYear}-${String(confirmDelete.billingMonth).padStart(2, "0")} · ${yen(confirmDelete.amountJpy)}. Its receipts are deleted too.`}
          confirmLabel="Delete"
          onConfirm={() => void handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function ProviderSettingsRow({
  provider,
  initial,
  onSaved,
}: {
  provider: UtilityProvider;
  initial?: UtilityProviderSettings;
  onSaved: () => void;
}) {
  const [customerNumber, setCustomerNumber] = useState(initial?.customerNumber ?? "");
  const [method, setMethod] = useState<string>(initial?.currentPaymentMethod ?? "");
  const [changedDate, setChangedDate] = useState(initial?.paymentMethodChangedDate ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await utilityBillsApi.saveProviderSettings(provider, {
        provider,
        customerNumber,
        currentPaymentMethod: (method || null) as UtilityPaymentMethod | null,
        paymentMethodChangedDate: changedDate || null,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-[160px_1fr_1fr_1fr_auto] md:items-end">
      <p className="text-sm font-medium">{PROVIDER_LABEL[provider]}</p>
      <Field label="Customer number (お客さま番号)">
        <Input value={customerNumber} onChange={(e) => setCustomerNumber(e.target.value)} />
      </Field>
      <Field label="Current payment method">
        <AppleSelect value={method} onChange={setMethod} options={PAYMENT_OPTIONS} />
      </Field>
      <Field label="Method changed on">
        <AppleDatePicker value={changedDate} onChange={setChangedDate} placeholder="Not changed" />
      </Field>
      <Button variant="outline" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
