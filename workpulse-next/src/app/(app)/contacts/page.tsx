"use client";

import { Users } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function ContactsPage() {
  return (
    <ComingSoon
      title="Contact Book"
      description="Search contacts, departments, and the email directory."
      icon={Users}
    />
  );
}