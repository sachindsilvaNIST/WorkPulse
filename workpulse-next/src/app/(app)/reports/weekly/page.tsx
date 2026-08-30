"use client";

import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import { NoteEditor } from "@/components/reports/note-editor";
import { weeklyReportsApi, settingsApi } from "@/lib/api/client";
import type { WeeklyReport } from "@/lib/api/types";

function startOfWeek(weekStartDay: string): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday .. 6 = Saturday
  const startsMonday = weekStartDay !== "Sunday";
  const diff = startsMonday ? (day === 0 ? -6 : 1 - day) : -day;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  return start.toISOString().slice(0, 10);
}

export default function WeeklyReportsPage() {
  // Settings > Week Start Day changes what "the start of this week" means here — fetched fresh
  // each time this page mounts rather than hardcoding Monday.
  const [weekStartDay, setWeekStartDay] = useState("Monday");

  useEffect(() => {
    settingsApi.get().then((s) => setWeekStartDay(s.weekStartDay)).catch(() => {});
  }, []);

  return (
    <NoteEditor<WeeklyReport>
      icon={CalendarRange}
      heading="Weekly Reports"
      subheading="Summarize your weekly progress"
      dateField="weekStartDate"
      dateLabel="Week of"
      api={weeklyReportsApi}
      basePath="/api/weeklyreports"
      makeNew={() => ({ weekStartDate: startOfWeek(weekStartDay) })}
      onExport={weeklyReportsApi.exportReports}
    />
  );
}
