"use client";

import { FileText } from "lucide-react";
import { NoteEditor } from "@/components/reports/note-editor";
import { dailyReportsApi } from "@/lib/api/client";
import type { DailyReport } from "@/lib/api/types";

export default function DailyReportsPage() {
  return (
    <NoteEditor<DailyReport>
      icon={FileText}
      heading="Daily Reports"
      subheading="Summarize what you worked on each day"
      dateField="reportDate"
      dateLabel="Date"
      api={dailyReportsApi}
      makeNew={() => ({ reportDate: new Date().toISOString().slice(0, 10) })}
    />
  );
}
