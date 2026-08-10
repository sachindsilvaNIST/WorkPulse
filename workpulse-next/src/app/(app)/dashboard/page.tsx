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
import { CalendarClock, Clock, TrendingUp, Umbrella } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceApi } from "@/lib/api/client";
import type { MonthlyData, YearMonthDto } from "@/lib/api/types";

const DAY_TYPE_COLORS: Record<string, string> = {
  WorkDay: "var(--brand-blue)",
  AnnualPaidLeave: "var(--brand-orange)",
  UnpaidLeave: "#8E8E93",
  PublicHoliday: "var(--brand-green)",
  Weekend: "#C7C7CC",
  BusinessTrip: "var(--brand-purple)",
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
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

export default function DashboardPage() {
  const [months, setMonths] = useState<YearMonthDto[]>([]);
  const [selected, setSelected] = useState<{ year: number; month: number } | null>(null);
  const [data, setData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      .catch(() => setError("No attendance data for this month yet."))
      .finally(() => setLoading(false));
  }, [selected]);

  const stats = useMemo(() => {
    if (!data) return null;
    const workDays = data.records.filter((r) => r.dayType === "WorkDay" && r.loginTime).length;
    const overtimeCount = data.records.filter((r) => r.isOvertime).length;
    const overtimeMinutes = data.records
      .filter((r) => r.isOvertime)
      .reduce((sum, r) => sum + r.overtimeHours * 60 + r.overtimeMinutes, 0);
    const leaveDays = data.records.filter(
      (r) => r.dayType === "AnnualPaidLeave" || r.dayType === "UnpaidLeave"
    ).length;
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
            {data?.monthLabel ?? "Track login, logout, overtime and monthly trends"}
          </p>
        </div>
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
      </motion.div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && !loading && <p className="text-sm text-muted-foreground">{error}</p>}

      {!loading && !error && data && stats && (
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
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        fontSize: 12,
                      }}
                    />
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
                    <Pie
                      data={dayTypeChart}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {dayTypeChart.map((entry) => (
                        <Cell key={entry.name} fill={DAY_TYPE_COLORS[entry.name] ?? "#999"} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
