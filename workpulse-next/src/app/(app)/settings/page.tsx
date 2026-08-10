"use client";

import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Sync, directories, theme, and preferences."
      icon={Settings}
    />
  );
}