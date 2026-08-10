"use client";

import { Briefcase } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function TripsPage() {
  return (
    <ComingSoon
      title="Business Trips"
      description="Trip reports with categorized receipts, tickets, and documents."
      icon={Briefcase}
    />
  );
}