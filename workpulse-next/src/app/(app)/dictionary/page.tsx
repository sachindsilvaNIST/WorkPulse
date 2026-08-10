"use client";

import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function DictionaryPage() {
  return (
    <ComingSoon
      title="JP Dictionary"
      description="Store and search Japanese words and phrases."
      icon={BookOpen}
    />
  );
}