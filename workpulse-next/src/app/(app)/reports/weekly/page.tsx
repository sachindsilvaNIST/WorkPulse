"use client";

import { CalendarRange } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function WeeklyReportsPage() {
  return (
    <ComingSoon
      title="Weekly Reports"
      description="Summarize your weekly progress, autosaved as you type."
      icon={CalendarRange}
    />
  );
}