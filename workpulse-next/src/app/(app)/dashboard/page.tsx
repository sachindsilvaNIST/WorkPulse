"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, Download, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageToolbar } from "@/components/shell/page-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AttendanceEntryDialog } from "@/components/attendance/entry-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { IconButton } from "@/components/ui/icon-button";
import { ToolbarCapsule } from "@/components/ui/toolbar-capsule";
import { StatTile } from "@/components/ui/stat-tile";
import { ProgressRing } from "@/components/ui/progress";
import { DataTable, DataTd, DataTh, DataTr } from "@/components/ui/table";
import { attendanceApi, settingsApi, tripReportsApi, downloadBlob } from "@/lib/api/client";
import { formatDate } from "@/lib/date-format";
import type { AppSettings, AttendanceRecord, MonthlyData, TripReport, YearMonthDto } from "@/lib/api/types";
import { DAY_TYPE_COLORS, LEAVE_DAY_TYPES, TIME_TRACKED_DAY_TYPES, dayTypeLabel } from "@/lib/attendance-day-types";
import {
  currentSettlementPeriodKey,
  effectiveSettlementPeriod,
  getSettlementPeriod,
  nextCalendarMonth,
  settlementBuckets,
  type SettlementPeriod,
} from "@/lib/settlement-period";
import { Spinner } from "@/components/ui/spinner";

function emptyMonth(year: number, month: number): MonthlyData {
  return {
    year,
    month,
    monthLabel: new Date(year, month - 1, 1).toLocaleString("default", { month: "short" }).toUpperCase(),
    title: `${new Date(year, month - 1, 1).toLocaleString("default", { month: "long" }).toUpperCase()} - MSW SETTLEMENT`,
    records: [],
  };
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function toMinutes(time?: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function formatHm(totalMinutes: number): string {
  const abs = Math.abs(Math.round(totalMinutes));
  return `${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, "0")}m`;
}

function formatClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  return `${String(h).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

function isoDateToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

export default function DashboardPage() {
  // "months" = distinct calendar months that have any saved data (from the backend, which still
  // stores/partitions records by real calendar month). "selected" is the nominal (year, month) of
  // the currently-viewed SETTLEMENT period (e.g. {year:2026, month:8} = "August 2026" = Jul 21 - Aug
  // 20, 2026) — not a calendar month. "bucketCache" holds the raw calendar-month MonthlyData objects
  // fetched from the backend, keyed by "year-month"; a settlement period reads from up to two of them
  // (the previous calendar month + its own) and filters to the period's actual date window.
  const [months, setMonths] = useState<YearMonthDto[]>([]);
  const [selected, setSelected] = useState<{ year: number; month: number } | null>(null);
  const [bucketCache, setBucketCache] = useState<Record<string, MonthlyData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<{ date: string; record?: AttendanceRecord } | null>(null);
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  // Export picker — any 1+ of the raw calendar months that have saved data (not settlement
  // periods; the export endpoint queries AttendanceMonths by real (year, month), same as the
  // backend always has, so offering settlement periods here would be a mismatch with what's
  // actually stored).
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set());
  // Months added via the "Add a month" picker below that aren't in `months` (i.e. nothing's ever
  // been saved for them) — kept separate from `months` since that list drives the settlement
  // dropdown and shouldn't imply data exists just because it was picked here. The backend now
  // exports these as an empty, labeled section rather than silently dropping them.
  const [extraExportMonths, setExtraExportMonths] = useState<YearMonthDto[]>([]);
  const [addMonthValue, setAddMonthValue] = useState("");
  const [exportFormat, setExportFormat] = useState<"xlsx" | "html">("xlsx");
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Custom settlement period override — lets the user pin a settlement window's exact start/end
  // dates instead of relying on the default 21st-to-20th (weekend-adjusted) calculation, for
  // whenever that auto-computed window doesn't match what actually got settled.
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customStartInput, setCustomStartInput] = useState("");
  const [customEndInput, setCustomEndInput] = useState("");
  const [savingCustomPeriod, setSavingCustomPeriod] = useState(false);
  const customizeRef = useRef<HTMLDivElement>(null);

  const exportableMonths = useMemo(() => {
    const seen = new Set(months.map((m) => `${m.year}-${m.month}`));
    const extras = extraExportMonths.filter((m) => !seen.has(`${m.year}-${m.month}`));
    return [...months, ...extras].sort((a, b) => b.year - a.year || b.month - a.month);
  }, [months, extraExportMonths]);

  function handleAddExportMonth() {
    if (!addMonthValue) return;
    const [year, month] = addMonthValue.split("-").map(Number);
    const key = `${year}-${month}`;
    if (!exportableMonths.some((m) => `${m.year}-${m.month}` === key)) {
      const label = new Date(year, month - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
      setExtraExportMonths((prev) => [...prev, { year, month, label }]);
    }
    setExportSelected((prev) => new Set(prev).add(key));
    setAddMonthValue("");
  }

  useEffect(() => {
    if (!exportOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportOpen]);

  useEffect(() => {
    if (!customizeOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (!customizeRef.current?.contains(e.target as Node)) setCustomizeOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [customizeOpen]);

  function toggleExportMonth(key: string) {
    setExportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleExport() {
    if (exportSelected.size === 0) return;
    setExporting(true);
    try {
      const selectedMonths = Array.from(exportSelected).map((key) => {
        const [year, month] = key.split("-").map(Number);
        return { year, month };
      });
      const { blob, fileName } = await attendanceApi.exportMonths(selectedMonths, exportFormat);
      downloadBlob(blob, fileName);
      setExportOpen(false);
      setExportSelected(new Set());
    } finally {
      setExporting(false);
    }
  }

  // Standard hours + overtime threshold come from Settings, not a hardcoded default, so changing
  // them there takes effect here immediately (next time the entry dialog is opened) — the whole
  // point of making this a "control panel" setting rather than a code constant.
  useEffect(() => {
    settingsApi.get().then(setAppSettings);
  }, []);

  useEffect(() => {
    // Default to whichever settlement period *today's date* actually falls in — not the
    // most-recently-saved month. Those diverge for every day between a period's cutoff (the
    // 20th, weekend-adjusted) and the end of that calendar month: e.g. on Aug 25, today belongs
    // to the September period (Aug 21-Sep 20) even though nobody's saved anything for September
    // yet and August is still the "latest saved" month — landing on August there was the bug.
    const defaultPeriod = currentSettlementPeriodKey();
    attendanceApi
      .getMonths()
      .then((list) => {
        setMonths(list);
        setSelected(defaultPeriod);
      })
      .catch(() => {
        setSelected(defaultPeriod);
      });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const buckets = settlementBuckets(selected.year, selected.month);
    Promise.all(
      buckets.map((b) =>
        attendanceApi.getMonth(b.year, b.month).catch(() => emptyMonth(b.year, b.month))
      )
    )
      .then((fetched) => {
        setBucketCache((prev) => {
          const next = { ...prev };
          for (const m of fetched) next[`${m.year}-${m.month}`] = m;
          return next;
        });
      })
      .finally(() => setLoading(false));
  }, [selected]);

  // The nominal end-month bucket is where a custom override (if any) lives — settlementBuckets'
  // second entry is always exactly {selected.year, selected.month} itself.
  const endMonthData = selected ? bucketCache[`${selected.year}-${selected.month}`] : undefined;

  const period: SettlementPeriod | null = useMemo(
    () =>
      selected
        ? effectiveSettlementPeriod(selected.year, selected.month, endMonthData?.customSettlementStart, endMonthData?.customSettlementEnd)
        : null,
    [selected, endMonthData]
  );

  const settlementOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: SettlementPeriod[] = [];
    for (const m of months) {
      for (const candidate of [{ year: m.year, month: m.month }, nextCalendarMonth(m.year, m.month)]) {
        const key = `${candidate.year}-${candidate.month}`;
        if (!seen.has(key)) {
          seen.add(key);
          opts.push(getSettlementPeriod(candidate.year, candidate.month));
        }
      }
    }
    return opts.sort((a, b) => b.year - a.year || b.month - a.month);
  }, [months]);

  const data: MonthlyData | null = useMemo(() => {
    if (!selected || !period) return null;
    const records = settlementBuckets(selected.year, selected.month)
      .flatMap((b) => bucketCache[`${b.year}-${b.month}`]?.records ?? [])
      .filter((r) => r.date >= period.periodStart && r.date <= period.periodEnd);
    return {
      year: selected.year,
      month: selected.month,
      monthLabel: period.label,
      title: `${period.label} Settlement (${period.periodStart} to ${period.periodEnd})`,
      records,
    };
  }, [selected, period, bucketCache]);

  const stats = useMemo(() => {
    if (!data) return null;
    const workDays = data.records.filter((r) => r.dayType === "WorkDay" && r.loginTime).length;
    const overtimeCount = data.records.filter((r) => r.isOvertime).length;
    const overtimeMinutes = data.records.filter((r) => r.isOvertime).reduce((sum, r) => sum + r.overtimeHours * 60 + r.overtimeMinutes, 0);
    const leaveDays = data.records.filter((r) => LEAVE_DAY_TYPES.includes(r.dayType)).length;
    return {
      workDays,
      overtimeCount,
      overtimeDisplay: `${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m`,
      leaveDays,
    };
  }, [data]);

  const dailyHoursChart = useMemo(() => {
    if (!data) return [];
    return data.records
      .filter((r) => TIME_TRACKED_DAY_TYPES.includes(r.dayType) && r.loginTime && r.logoutTime)
      .map((r) => {
        const [lh, lm] = r.loginTime!.split(":").map(Number);
        const [oh, om] = r.logoutTime!.split(":").map(Number);
        const hours = Math.max(0, oh + om / 60 - (lh + lm / 60));
        return { day: r.date.slice(8, 10), hours: Math.round(hours * 10) / 10, dayType: r.dayType };
      });
  }, [data]);

  const dayTypeChart = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    for (const r of data.records) counts.set(r.dayType, (counts.get(r.dayType) ?? 0) + 1);
    return Array.from(counts.entries()).map(([key, value]) => ({ key, name: dayTypeLabel(key), value }));
  }, [data]);

  const filteredRecords = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.records].sort((a, b) => a.date.localeCompare(b.date));
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) =>
      `${r.date} ${r.dayType} ${r.holidayName ?? ""} ${r.tripRegion ?? ""} ${r.loginTime ?? ""} ${r.logoutTime ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [data, search]);

  // A settlement period spans (up to) two calendar months, and the backend still partitions/saves
  // records by real calendar month — so a save or delete must route to whichever calendar-month
  // bucket the record's own date actually falls in, not just the currently-viewed settlement bucket.
  async function getOrFetchBucket(year: number, month: number): Promise<MonthlyData> {
    const key = `${year}-${month}`;
    if (bucketCache[key]) return bucketCache[key];
    const fetched = await attendanceApi.getMonth(year, month).catch(() => emptyMonth(year, month));
    setBucketCache((prev) => ({ ...prev, [key]: fetched }));
    return fetched;
  }

  async function persistRecords(records: AttendanceRecord[]) {
    const groups = new Map<string, AttendanceRecord[]>();
    for (const r of records) {
      const [y, m] = r.date.split("-").map(Number);
      const key = `${y}-${m}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    for (const [key, groupRecords] of groups) {
      const [y, m] = key.split("-").map(Number);
      const bucket = await getOrFetchBucket(y, m);
      let bucketRecords = [...bucket.records];
      for (const r of groupRecords) {
        bucketRecords = bucketRecords.filter((x) => x.date !== r.date);
        bucketRecords.push(r);
      }
      const nextBucket: MonthlyData = { ...bucket, year: y, month: m, records: bucketRecords };
      setBucketCache((prev) => ({ ...prev, [key]: nextBucket }));
      await attendanceApi.saveMonth(y, m, nextBucket);
      if (!months.some((mo) => mo.year === y && mo.month === m)) {
        setMonths((prev) => [...prev, { year: y, month: m, label: nextBucket.monthLabel }]);
      }
    }
  }

  function handleDialogSave(records: AttendanceRecord[]) {
    persistRecords(records);
    setDialogState(null);
  }

  async function handleDelete(dateStr: string) {
    const [y, m] = dateStr.split("-").map(Number);
    const bucket = await getOrFetchBucket(y, m);
    const nextBucket: MonthlyData = { ...bucket, records: bucket.records.filter((r) => r.date !== dateStr) };
    setBucketCache((prev) => ({ ...prev, [`${y}-${m}`]: nextBucket }));
    await attendanceApi.saveMonth(y, m, nextBucket);
    if (selectedDate === dateStr) setSelectedDate(null);
  }

  function openCustomizePeriod() {
    setCustomStartInput(period?.periodStart ?? "");
    setCustomEndInput(period?.periodEnd ?? "");
    setCustomizeOpen(true);
  }

  async function persistCustomPeriod(start: string | null, end: string | null) {
    if (!selected) return;
    setSavingCustomPeriod(true);
    try {
      const bucket = await getOrFetchBucket(selected.year, selected.month);
      const nextBucket: MonthlyData = { ...bucket, customSettlementStart: start, customSettlementEnd: end };
      setBucketCache((prev) => ({ ...prev, [`${selected.year}-${selected.month}`]: nextBucket }));
      await attendanceApi.saveMonth(selected.year, selected.month, nextBucket);
      if (!months.some((mo) => mo.year === selected.year && mo.month === selected.month)) {
        setMonths((prev) => [...prev, { year: selected.year, month: selected.month, label: nextBucket.monthLabel }]);
      }
      setCustomizeOpen(false);
    } finally {
      setSavingCustomPeriod(false);
    }
  }

  function handleSaveCustomPeriod() {
    if (!customStartInput || !customEndInput) return;
    persistCustomPeriod(customStartInput, customEndInput);
  }

  function handleResetCustomPeriod() {
    persistCustomPeriod(null, null);
  }

  const [trips, setTrips] = useState<TripReport[]>([]);
  useEffect(() => {
    tripReportsApi.getAll().then(setTrips).catch(() => {});
  }, []);

  const todayIso = isoDateToday();
  const nowDate = new Date();
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const todayRecord = data?.records.find((r) => r.date === todayIso);
  const standardLogin = toMinutes(appSettings?.standardLoginTime) ?? 8 * 60 + 25;
  const standardLogout = toMinutes(appSettings?.standardLogoutTime) ?? 17 * 60 + 30;
  const standardMinutes = Math.max(1, standardLogout - standardLogin);
  const todayLogin = toMinutes(todayRecord?.loginTime);
  const todayLogout = toMinutes(todayRecord?.logoutTime);
  const workedMinutes =
    todayLogin == null
      ? 0
      : todayLogout != null
        ? Math.max(0, todayLogout - todayLogin)
        : Math.max(0, nowMinutes - todayLogin);
  const todayState: "none" | "running" | "done" =
    todayLogin == null ? "none" : todayLogout != null ? "done" : "running";
  const endReference = todayLogout ?? nowMinutes;
  const deltaToStandardEnd = standardLogout - endReference;

  const averageClockIn = useMemo(() => {
    if (!data) return null;
    const logins = data.records
      .filter((r) => r.dayType === "WorkDay" && r.loginTime)
      .map((r) => toMinutes(r.loginTime) as number);
    if (logins.length === 0) return null;
    return Math.round(logins.reduce((a, b) => a + b, 0) / logins.length);
  }, [data]);

  const holidayCount = useMemo(() => (data ? data.records.filter((r) => !!r.holidayName).length : 0), [data]);

  const nextTrip = useMemo(() => {
    return [...trips]
      .filter((t) => t.startDate >= todayIso)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
  }, [trips, todayIso]);

  const todayLabel = nowDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const selectedIndex = selected ? settlementOptions.findIndex((o) => o.year === selected.year && o.month === selected.month) : -1;
  const olderOption = selectedIndex >= 0 ? settlementOptions[selectedIndex + 1] : undefined;
  const newerOption = selectedIndex > 0 ? settlementOptions[selectedIndex - 1] : undefined;

  function statusFor(r: AttendanceRecord): { variant: "success" | "warning" | "neutral" | "info"; label: string; dot?: boolean } {
    if (r.date === todayIso && r.loginTime && !r.logoutTime) return { variant: "info", label: "In progress", dot: true };
    if (r.isOvertime) return { variant: "warning", label: "Overtime" };
    if (r.holidayName) return { variant: "neutral", label: r.holidayName };
    if (r.dayType !== "WorkDay") return { variant: "neutral", label: dayTypeLabel(r.dayType) };
    if (r.loginTime) return { variant: "success", label: "On time" };
    return { variant: "neutral", label: dayTypeLabel(r.dayType) };
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageToolbar
        title="Attendance"
        description={
          <span className="flex flex-wrap items-center gap-2">
            {period
              ? `${period.label} Settlement · ${formatShortDate(period.periodStart)} – ${formatShortDate(period.periodEnd)}, ${period.year}`
              : "Track login, logout, overtime and monthly trends"}
            {endMonthData?.customSettlementStart && endMonthData?.customSettlementEnd && (
              <Badge variant="neutral">Custom period</Badge>
            )}
          </span>
        }
      >
        {selected && (
          <ToolbarCapsule aria-label="Settlement period">
            <IconButton aria-label="Previous settlement period" disabled={!olderOption} onClick={() => olderOption && setSelected({ year: olderOption.year, month: olderOption.month })}>
              <ChevronLeft />
            </IconButton>
            <span className="min-w-[7.5rem] text-center text-sm font-semibold tabular-nums" aria-live="polite">
              {period?.label ?? ""}
            </span>
            <IconButton aria-label="Next settlement period" disabled={!newerOption} onClick={() => newerOption && setSelected({ year: newerOption.year, month: newerOption.month })}>
              <ChevronRight />
            </IconButton>
          </ToolbarCapsule>
        )}

        {selected && (
          <div className="relative" ref={customizeRef}>
            <Button variant="glass" size="sm" onClick={() => (customizeOpen ? setCustomizeOpen(false) : openCustomizePeriod())}>
              <Settings2 className="size-4" /> Customize period
            </Button>
            <AnimatePresence>
              {customizeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="glass absolute right-0 top-full z-20 mt-2 w-72 rounded-inner p-4"
                >
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Settlement period for {period?.label}</p>
                  <p className="mb-3 text-xs text-text-secondary">
                    Overrides the default 21st–20th (weekend-adjusted) window with exact dates — use this if the standard calculation doesn&apos;t match what actually got settled.
                  </p>
                  <div className="mb-3 flex flex-col gap-2">
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      Start date
                      <Input type="date" value={customStartInput} onChange={(e) => setCustomStartInput(e.target.value)} className="h-9 text-xs" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      End date
                      <Input type="date" value={customEndInput} onChange={(e) => setCustomEndInput(e.target.value)} className="h-9 text-xs" />
                    </label>
                  </div>
                  <div className="flex gap-1.5">
                    {endMonthData?.customSettlementStart && endMonthData?.customSettlementEnd && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={handleResetCustomPeriod} disabled={savingCustomPeriod}>
                        Reset to default
                      </Button>
                    )}
                    <Button size="sm" className="flex-1" onClick={handleSaveCustomPeriod} disabled={!customStartInput || !customEndInput || savingCustomPeriod}>
                      {savingCustomPeriod ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="relative" ref={exportRef}>
          <Button variant="glass" size="sm" onClick={() => setExportOpen((v) => !v)}>
            <Download className="size-4" /> Export
          </Button>
          <AnimatePresence>
            {exportOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="glass absolute right-0 top-full z-20 mt-2 w-72 rounded-inner p-4"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Select months</p>
                <div className="mb-3 flex max-h-52 flex-col gap-0.5 overflow-y-auto">
                  {exportableMonths.length === 0 && <p className="px-2 py-1.5 text-xs text-text-secondary">No months yet — add one below.</p>}
                  {exportableMonths.map((m) => {
                    const key = `${m.year}-${m.month}`;
                    return (
                      <label key={key} className="flex cursor-pointer items-center gap-2 rounded-item px-2 py-1.5 text-sm hover:bg-fill-1">
                        <input type="checkbox" checked={exportSelected.has(key)} onChange={() => toggleExportMonth(key)} className="size-4 cursor-pointer accent-primary" />
                        {m.label}
                      </label>
                    );
                  })}
                </div>
                <div className="mb-3 flex gap-1.5">
                  <Input type="month" value={addMonthValue} onChange={(e) => setAddMonthValue(e.target.value)} className="h-9 flex-1 text-xs" />
                  <Button size="sm" variant="outline" onClick={handleAddExportMonth} disabled={!addMonthValue}>
                    Add
                  </Button>
                </div>
                <div className="mb-3 flex gap-1">
                  <Button variant={exportFormat === "xlsx" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setExportFormat("xlsx")}>
                    XLSX
                  </Button>
                  <Button variant={exportFormat === "html" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setExportFormat("html")}>
                    HTML
                  </Button>
                </div>
                <Button size="sm" className="w-full" onClick={handleExport} disabled={exportSelected.size === 0 || exporting}>
                  {exporting ? "Exporting…" : exportSelected.size > 0 ? `Export ${exportSelected.size} month${exportSelected.size === 1 ? "" : "s"}` : "Export"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <IconButton
          aria-label={editMode ? "Finish editing" : "Edit records"}
          aria-pressed={editMode}
          title={editMode ? "Done" : "Edit"}
          onClick={() => setEditMode((v) => !v)}
          className={editMode ? "bg-primary text-primary-foreground hover:bg-primary" : undefined}
        >
          <Pencil />
        </IconButton>

        <Button size="default" onClick={() => setDialogState({ date: todayIso })}>
          <Plus className="size-4" /> Log time
        </Button>
      </PageToolbar>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Spinner size={16} /> Loading…
        </div>
      )}
      {error && !loading && <p className="text-sm text-text-secondary">{error}</p>}

      {!loading && data && stats && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <GlassPanel className="flex flex-[2_1_400px] flex-wrap items-center gap-6 p-[22px]">
              <ProgressRing
                value={standardMinutes > 0 ? workedMinutes / standardMinutes : 0}
                center={formatHm(workedMinutes)}
                caption={`of ${formatHm(standardMinutes)}`}
                label={`Worked ${formatHm(workedMinutes)} of ${formatHm(standardMinutes)}`}
              />
              <div className="flex min-w-[220px] flex-1 flex-col gap-3.5">
                <p className="text-[13px] font-semibold text-text-secondary">Today · {todayLabel}</p>
                <h2 className="text-[22px] font-bold tracking-[-0.02em] text-text-primary">
                  {todayState === "none" ? "Not clocked in yet" : todayState === "running" ? "You're on the clock" : "Done for today"}
                </h2>
                <div className="flex flex-wrap gap-5">
                  <div>
                    <p className="text-xs text-text-secondary">Clocked in</p>
                    <p className="text-[17px] font-semibold tabular-nums">{todayRecord?.loginTime ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Standard end</p>
                    <p className="text-[17px] font-semibold tabular-nums">{formatClock(standardLogout)}</p>
                  </div>
                  {todayLogin != null && (
                    <div>
                      <p className="text-xs text-text-secondary">{deltaToStandardEnd >= 0 ? "Remaining" : "Overtime"}</p>
                      <p className="text-[17px] font-semibold tabular-nums">{formatHm(deltaToStandardEnd)}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled title="Coming soon">Clock in</Button>
                  <Button variant="glass" disabled title="Coming soon">Add note</Button>
                </div>
              </div>
            </GlassPanel>

            <div className="grid flex-[3_1_480px] grid-cols-2 gap-4">
              <StatTile label="Work days" value={stats.workDays} unit={`of ${data.records.length}`} caption={`Period so far · ${holidayCount} holiday${holidayCount === 1 ? "" : "s"}`} />
              <StatTile label="Overtime sessions" value={stats.overtimeCount} caption="Sessions past the standard end" />
              <StatTile label="Overtime total" value={stats.overtimeDisplay} caption="Across this period" />
              <StatTile
                label="Avg. clock-in"
                value={averageClockIn != null ? formatClock(averageClockIn) : "—"}
                caption="Work days with a login"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-4">
            <GlassPanel className="flex-[3_1_560px] p-2">
              <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 pb-2.5 pt-3">
                <h2 className="text-[17px] font-[650] tracking-[-0.01em]">Attendance log</h2>
                <div className="flex items-center gap-2">
                  <SearchInput placeholder="Search…" value={search} onValueChange={setSearch} small inputClassName="h-9 w-40 text-xs" />
                  {editMode && (
                    <>
                      <Button size="sm" onClick={() => setDialogState({ date: todayIso })}>
                        <Plus className="size-3.5" /> Entry
                      </Button>
                      {selectedDate && (
                        <Button size="sm" variant="destructive" onClick={() => setConfirmDeleteDate(selectedDate)}>
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {filteredRecords.length === 0 ? (
                <p className="p-5 text-sm text-text-secondary">No records for this settlement period yet.</p>
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <DataTh>Date</DataTh>
                      <DataTh>In</DataTh>
                      <DataTh>Out</DataTh>
                      <DataTh>Worked</DataTh>
                      <DataTh>Overtime</DataTh>
                      <DataTh>Status</DataTh>
                      {editMode && <DataTh />}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => {
                      const status = statusFor(r);
                      const inMin = toMinutes(r.loginTime);
                      const outMin = toMinutes(r.logoutTime);
                      const worked = inMin != null && outMin != null ? formatHm(outMin - inMin) : "—";
                      const [yy, mm, dd] = r.date.split("-").map(Number);
                      const weekday = new Date(Date.UTC(yy, mm - 1, dd)).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
                      return (
                        <DataTr
                          key={r.date}
                          onClick={() => editMode && setSelectedDate(r.date === selectedDate ? null : r.date)}
                          className={`${editMode ? "cursor-pointer" : ""} ${selectedDate === r.date ? "bg-fill-1" : ""}`}
                        >
                          <DataTd>
                            <span className="font-semibold">{formatDate(r.date, appSettings?.dateFormat ?? "MM/dd/yyyy")}</span>
                            <span className="ml-1.5 text-xs text-text-secondary">{weekday}</span>
                            {r.tripRegion && <span className="ml-1.5 text-xs text-text-secondary">{r.tripRegion}</span>}
                            {r.dayType === "HourlyLeave" && (
                              <span className="ml-1.5 text-xs text-text-secondary">
                                {r.leaveHours ?? 0}h {r.leaveMinutes ?? 0}m
                              </span>
                            )}
                          </DataTd>
                          <DataTd>{r.loginTime ?? "—"}</DataTd>
                          <DataTd>{r.logoutTime ?? "—"}</DataTd>
                          <DataTd>{worked}</DataTd>
                          <DataTd>{r.isOvertime ? `${r.overtimeHours}h ${r.overtimeMinutes}m` : "—"}</DataTd>
                          <DataTd>
                            <Badge variant={status.variant} dot={status.dot}>
                              {status.label}
                            </Badge>
                          </DataTd>
                          {editMode && (
                            <DataTd>
                              <div className="flex items-center justify-end gap-1">
                                <IconButton
                                  aria-label={`Edit ${r.date}`}
                                  className="size-9"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDialogState({ date: r.date, record: r });
                                  }}
                                >
                                  <Pencil />
                                </IconButton>
                                <IconButton
                                  aria-label={`Delete ${r.date}`}
                                  className="size-9 hover:text-status-danger-fg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteDate(r.date);
                                  }}
                                >
                                  <Trash2 />
                                </IconButton>
                              </div>
                            </DataTd>
                          )}
                        </DataTr>
                      );
                    })}
                  </tbody>
                </DataTable>
              )}
            </GlassPanel>

            <div className="flex min-w-[260px] flex-[1_1_300px] flex-col gap-4">
              {nextTrip ? (
                <GlassPanel className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-text-secondary">Next business trip</p>
                    <Badge variant={nextTrip.status === "Approved" ? "success" : nextTrip.status === "Submitted" ? "warning" : "neutral"}>
                      {nextTrip.status}
                    </Badge>
                  </div>
                  <p className="text-[22px] font-bold tracking-[-0.02em]">{nextTrip.destination || "Untitled trip"}</p>
                  <p className="text-sm text-text-secondary">
                    {formatShortDate(nextTrip.startDate)} – {formatShortDate(nextTrip.endDate)} · {nextTrip.category}
                  </p>
                  <Button asChild variant="glass" className="w-full">
                    <Link href="/trips">Upload receipts</Link>
                  </Button>
                </GlassPanel>
              ) : (
                <GlassPanel className="flex flex-col gap-1.5">
                  <p className="text-[13px] font-semibold text-text-secondary">Next business trip</p>
                  <p className="text-sm text-text-secondary">No upcoming trips.</p>
                </GlassPanel>
              )}

              <GlassPanel className="flex flex-col gap-2 opacity-70">
                <p className="text-[13px] font-semibold text-text-secondary">Weekly report</p>
                <p className="text-sm text-text-secondary">Coming soon.</p>
              </GlassPanel>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily hours worked</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyHoursChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--separator)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary)" width={30} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--separator)", background: "var(--glass-bg)", fontSize: 12 }} />
                    <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                      {dailyHoursChart.map((entry) => (
                        <Cell key={entry.day} fill={DAY_TYPE_COLORS[entry.dayType] ?? "var(--accent)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Day type breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={dayTypeChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {dayTypeChart.map((entry) => (
                        <Cell key={entry.key} fill={DAY_TYPE_COLORS[entry.key] ?? "var(--text-tertiary)"} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--separator)", background: "var(--glass-bg)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {dialogState && (
        <AttendanceEntryDialog
          initial={{ date: dialogState.date, ...dialogState.record }}
          onSave={handleDialogSave}
          onCancel={() => setDialogState(null)}
          standardLoginTime={appSettings?.standardLoginTime.slice(0, 5)}
          standardLogoutTime={appSettings?.standardLogoutTime.slice(0, 5)}
          overtimeBreakDeductionMinutes={appSettings?.overtimeBreakDeductionMinutes}
        />
      )}

      {confirmDeleteDate && (
        <ConfirmDialog
          title="Delete this entry?"
          description={`This will permanently remove the attendance record for ${confirmDeleteDate}.`}
          confirmLabel="Yes"
          cancelLabel="No"
          onConfirm={() => {
            handleDelete(confirmDeleteDate);
            setConfirmDeleteDate(null);
          }}
          onCancel={() => setConfirmDeleteDate(null)}
        />
      )}
    </div>
  );
}
