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
import { CalendarClock, Clock, Pencil, Plus, Search, Trash2, TrendingUp, Umbrella, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AttendanceEntryDialog } from "@/components/attendance/entry-dialog";
import { attendanceApi } from "@/lib/api/client";
import type { AttendanceRecord, MonthlyData, YearMonthDto } from "@/lib/api/types";

const DAY_TYPE_COLORS: Record<string, string> = {
  WorkDay: "var(--brand-blue)",
  AnnualPaidLeave: "var(--brand-orange)",
  UnpaidLeave: "#8E8E93",
  PublicHoliday: "var(--brand-green)",
  Weekend: "#C7C7CC",
  BusinessTrip: "var(--brand-purple)",
};

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
  const [months, setMonths] = useState<YearMonthDto[]>([]);
  const [selected, setSelected] = useState<{ year: number; month: number } | null>(null);
  const [data, setData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<{ date: string; record?: AttendanceRecord } | null>(null);

  useEffect(() => {
    attendanceApi
      .getMonths()
      .then((list) => {
        setMonths(list);
        if (list.length > 0) {
          const latest = list[list.length - 1];
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
    attendanceApi
      .getMonth(selected.year, selected.month)
      .then(setData)
      .catch(() =>
        setData({
          year: selected.year,
          month: selected.month,
          monthLabel: new Date(selected.year, selected.month - 1, 1).toLocaleString("default", { month: "short" }).toUpperCase(),
          title: `${new Date(selected.year, selected.month - 1, 1).toLocaleString("default", { month: "long" }).toUpperCase()} - MSW SETTLEMENT`,
          records: [],
        })
      )
      .finally(() => setLoading(false));
  }, [selected]);

  const stats = useMemo(() => {
    if (!data) return null;
    const workDays = data.records.filter((r) => r.dayType === "WorkDay" && r.loginTime).length;
    const overtimeCount = data.records.filter((r) => r.isOvertime).length;
    const overtimeMinutes = data.records.filter((r) => r.isOvertime).reduce((sum, r) => sum + r.overtimeHours * 60 + r.overtimeMinutes, 0);
    const leaveDays = data.records.filter((r) => r.dayType === "AnnualPaidLeave" || r.dayType === "UnpaidLeave").length;
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
      .filter((r) => r.dayType === "WorkDay" && r.loginTime && r.logoutTime)
      .map((r) => {
        const [lh, lm] = r.loginTime!.split(":").map(Number);
        const [oh, om] = r.logoutTime!.split(":").map(Number);
        const hours = Math.max(0, oh + om / 60 - (lh + lm / 60));
        return { day: r.date.slice(8, 10), hours: Math.round(hours * 10) / 10 };
      });
  }, [data]);

  const dayTypeChart = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    for (const r of data.records) counts.set(r.dayType, (counts.get(r.dayType) ?? 0) + 1);
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
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

  async function persist(nextRecords: AttendanceRecord[]) {
    if (!data) return;
    const nextData: MonthlyData = { ...data, records: nextRecords };
    setData(nextData);
    await attendanceApi.saveMonth(nextData.year, nextData.month, nextData);
    if (!months.some((m) => m.year === nextData.year && m.month === nextData.month)) {
      setMonths((prev) => [...prev, { year: nextData.year, month: nextData.month, label: nextData.monthLabel }]);
    }
  }

  function handleDialogSave(records: AttendanceRecord[]) {
    if (!data) return;
    let next = [...data.records];
    for (const record of records) {
      next = next.filter((r) => r.date !== record.date);
      next.push(record);
    }
    persist(next);
    setDialogState(null);
  }

  function handleDelete(dateStr: string) {
    if (!data) return;
    persist(data.records.filter((r) => r.date !== dateStr));
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
          <p className="mt-1 text-muted-foreground">{data?.monthLabel ?? "Track login, logout, overtime and monthly trends"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {months.length > 0 && selected && (
            <select
              className="h-9 rounded-full border border-input bg-background/60 px-4 text-sm backdrop-blur-md outline-none"
              value={`${selected.year}-${selected.month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setSelected({ year: y, month: m });
              }}
            >
              {months.map((m) => (
                <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {m.label}
                </option>
              ))}
            </select>
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
                    <Bar dataKey="hours" fill="var(--brand-blue)" radius={[6, 6, 0, 0]} />
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
                        <Cell key={entry.name} fill={DAY_TYPE_COLORS[entry.name] ?? "#999"} />
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
                    <Button
                      size="sm"
                      onClick={() =>
                        setDialogState({ date: selected ? `${selected.year}-${String(selected.month).padStart(2, "0")}-01` : new Date().toISOString().slice(0, 10) })
                      }
                    >
                      <Plus className="size-3.5" /> Entry
                    </Button>
                    {selectedDate && (
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedDate)}>
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {filteredRecords.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No records for this month yet.</p>
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
                        <td className="px-4 py-2">{r.date}</td>
                        <td className="px-4 py-2">
                          <Badge variant="secondary">{r.dayType}</Badge>
                          {r.tripRegion && <span className="ml-1.5 text-xs text-muted-foreground">{r.tripRegion}</span>}
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
                                className="size-3.5 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDialogState({ date: r.date, record: r });
                                }}
                              />
                              <X
                                className="size-3.5 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(r.date);
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
        />
      )}
    </div>
  );
}
