"use client";

import { CalendarRange } from "lucide-react";
import { NoteEditor } from "@/components/reports/note-editor";
import { weeklyReportsApi } from "@/lib/api/client";
import type { WeeklyReport } from "@/lib/api/types";

function startOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export default function WeeklyReportsPage() {
  return (
    <NoteEditor<WeeklyReport>
      icon={CalendarRange}
      heading="Weekly Reports"
      subheading="Summarize your weekly progress"
      dateField="weekStartDate"
      dateLabel="Week of"
      api={weeklyReportsApi}
      makeNew={() => ({ weekStartDate: startOfWeek() })}
    />
  );
}
