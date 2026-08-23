"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
import { CalendarClock, ChevronDown, Clock, Pencil, Plus, Search, Trash2, TrendingUp, Umbrella } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AttendanceEntryDialog } from "@/components/attendance/entry-dialog";
import { attendanceApi, settingsApi } from "@/lib/api/client";
import { formatDate } from "@/lib/date-format";
import type { AppSettings, AttendanceRecord, MonthlyData, YearMonthDto } from "@/lib/api/types";
import { DAY_TYPE_COLORS, LEAVE_DAY_TYPES, TIME_TRACKED_DAY_TYPES, dayTypeLabel } from "@/lib/attendance-day-types";
import { getSettlementPeriod, nextCalendarMonth, settlementBuckets, type SettlementPeriod } from "@/lib/settlement-period";

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

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          <Icon className="size-5" strokeWidth={2} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tracking-tight">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function overtimeFlag(r: AttendanceRecord): string {
  if (r.dayType !== "WorkDay" || !r.isOvertimeDecided) return "";
  return r.isOvertime ? "YES" : "NO";
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

  // Standard hours + overtime threshold come from Settings, not a hardcoded default, so changing
  // them there takes effect here immediately (next time the entry dialog is opened) — the whole
  // point of making this a "control panel" setting rather than a code constant.
  useEffect(() => {
    settingsApi.get().then(setAppSettings);
  }, []);

  useEffect(() => {
    attendanceApi
      .getMonths()
      .then((list) => {
        setMonths(list);
        if (list.length > 0) {
          const latest = list[0];
          setSelected({ year: latest.year, month: latest.month });
        } else {
          const now = new Date();
          setSelected({ year: now.getFullYear(), month: now.getMonth() + 1 });
        }
      })
      .catch(() => {
        const now = new Date();
        setSelected({ year: now.getFullYear(), month: now.getMonth() + 1 });
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

  const period: SettlementPeriod | null = useMemo(
    () => (selected ? getSettlementPeriod(selected.year, selected.month) : null),
    [selected]
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

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            {period
              ? `${period.label} Settlement · ${formatShortDate(period.periodStart)} – ${formatShortDate(period.periodEnd)}, ${period.year}`
              : "Track login, logout, overtime and monthly trends"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settlementOptions.length > 0 && selected && (
            <div className="relative">
              <select
                className="h-9 appearance-none rounded-full border border-input bg-background/60 py-2 pl-4 pr-9 text-sm backdrop-blur-md outline-none"
                value={`${selected.year}-${selected.month}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-").map(Number);
                  setSelected({ year: y, month: m });
                }}
              >
                {settlementOptions.map((opt) => (
                  <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode((v) => !v)}
          >
            <Pencil className="size-3.5" /> {editMode ? "Done" : "Edit"}
          </Button>
        </div>
      </motion.div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && !loading && <p className="text-sm text-muted-foreground">{error}</p>}

      {!loading && data && stats && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Work Days" value={String(stats.workDays)} icon={CalendarClock} color="var(--brand-blue)" />
            <StatCard label="Overtime Days" value={String(stats.overtimeCount)} icon={Clock} color="var(--brand-orange)" />
            <StatCard label="Overtime Total" value={stats.overtimeDisplay} icon={TrendingUp} color="var(--brand-purple)" />
            <StatCard label="Leave Days" value={String(stats.leaveDays)} icon={Umbrella} color="var(--brand-green)" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily hours worked</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyHoursChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={30} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                    <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                      {dailyHoursChart.map((entry) => (
                        <Cell key={entry.day} fill={DAY_TYPE_COLORS[entry.dayType] ?? "var(--brand-blue)"} />
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
                        <Cell key={entry.key} fill={DAY_TYPE_COLORS[entry.key] ?? "#999"} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Records table */}
          <Card className="mt-6">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle>Attendance Records</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-40 pl-8 text-xs"
                  />
                </div>
                {editMode && (
                  <>
                    <Button size="sm" onClick={() => setDialogState({ date: new Date().toISOString().slice(0, 10) })}>
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
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {filteredRecords.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No records for this settlement period yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Login</th>
                      <th className="px-4 py-2 font-medium">Logout</th>
                      <th className="px-4 py-2 font-medium">OT</th>
                      {editMode && <th className="px-4 py-2 font-medium"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => (
                      <tr
                        key={r.date}
                        onClick={() => editMode && setSelectedDate(r.date === selectedDate ? null : r.date)}
                        className={`border-b border-white/5 ${editMode ? "cursor-pointer" : ""} ${
                          selectedDate === r.date ? "bg-primary/10" : "hover:bg-foreground/5"
                        }`}
                      >
                        <td className="px-4 py-2">{formatDate(r.date, appSettings?.dateFormat ?? "MM/dd/yyyy")}</td>
                        <td className="px-4 py-2">
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${DAY_TYPE_COLORS[r.dayType] ?? "#8E8E93"} 15%, transparent)`,
                              borderColor: `color-mix(in srgb, ${DAY_TYPE_COLORS[r.dayType] ?? "#8E8E93"} 35%, transparent)`,
                              color: DAY_TYPE_COLORS[r.dayType] ?? "#8E8E93",
                            }}
                          >
                            {dayTypeLabel(r.dayType)}
                          </Badge>
                          {r.tripRegion && <span className="ml-1.5 text-xs text-muted-foreground">{r.tripRegion}</span>}
                          {r.dayType === "HourlyLeave" && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {r.leaveHours ?? 0}h {r.leaveMinutes ?? 0}m
                            </span>
                          )}
                          {r.holidayName && r.dayType !== "BusinessTrip" && (
                            <span className="ml-1.5 text-xs text-muted-foreground">{r.holidayName}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">{r.loginTime ?? "—"}</td>
                        <td className="px-4 py-2">{r.logoutTime ?? "—"}</td>
                        <td className="px-4 py-2">
                          {overtimeFlag(r) && (
                            <Badge variant={overtimeFlag(r) === "YES" ? "default" : "secondary"}>
                              {overtimeFlag(r) === "YES" ? `${r.overtimeHours}h ${r.overtimeMinutes}m` : "No OT"}
                            </Badge>
                          )}
                        </td>
                        {editMode && (
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <Pencil
                                className="size-3.5 cursor-pointer text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDialogState({ date: r.date, record: r });
                                }}
                              />
                              <Trash2
                                className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteDate(r.date);
                                }}
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
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
