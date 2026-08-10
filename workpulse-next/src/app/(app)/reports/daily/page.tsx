"use client";

import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function DailyReportsPage() {
  return (
    <ComingSoon
      title="Daily Reports"
      description="Apple Notes-style autosaving daily work reports."
      icon={FileText}
    />
  );
}