"use client";

import { Receipt } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function ReimbursementPage() {
  return (
    <ComingSoon
      title="Reimbursement"
      description="Every trip document, searchable across all your trips at once."
      icon={Receipt}
    />
  );
}