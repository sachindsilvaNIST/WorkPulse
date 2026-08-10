"use client";

import { Bookmark } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function BookmarksPage() {
  return (
    <ComingSoon
      title="Bookmark Library"
      description="Find any saved link instantly by name, synonym, or category."
      icon={Bookmark}
    />
  );
}