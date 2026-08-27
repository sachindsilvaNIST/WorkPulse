import {
  LayoutDashboard,
  CalendarClock,
  FileText,
  CalendarRange,
  Briefcase,
  Receipt,
  Bookmark,
  Users,
  BookOpen,
  Mail,
  Library,
  Settings,
  type LucideIcon,
} from "lucide-react";

/** NavItem.color is either a literal CSS color ("#D13438") or a "brand-*" token name resolving to
 * the matching --brand-* custom property defined in globals.css — this turns either form into a
 * value usable directly in inline styles / color-mix(). */
export function resolveNavColor(color: string): string {
  return color.startsWith("brand-") ? `var(--${color})` : color;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  color: string; // tailwind text/bg color token suffix, matches brand palette
  description: string;
  /** Temporarily hidden from the sidebar and Home tiles. The route itself stays live — this is a
   * discoverability toggle, not an access gate — so it's a one-line flip to bring back later. */
  disabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/home",
    label: "Home",
    icon: LayoutDashboard,
    color: "brand-blue",
    description: "Your WorkPulse overview",
  },
  {
    href: "/dashboard",
    label: "Attendance",
    icon: CalendarClock,
    color: "brand-blue",
    description: "Track login, logout, overtime and monthly reports",
  },
  {
    href: "/reports/daily",
    label: "Daily Reports",
    icon: FileText,
    color: "#D13438",
    description: "Summarize what you worked on each day",
  },
  {
    href: "/reports/weekly",
    label: "Weekly Reports",
    icon: CalendarRange,
    color: "#106EBE",
    description: "Summarize your weekly progress",
    disabled: true,
  },
  {
    href: "/trips",
    label: "Business Trips",
    icon: Briefcase,
    color: "brand-purple",
    description: "Trip reports, receipts, tickets and documents",
  },
  {
    href: "/reimbursement",
    label: "Reimbursement",
    icon: Receipt,
    color: "brand-rose",
    description: "Every trip document, found in a second",
  },
  {
    href: "/bookmarks",
    label: "Bookmarks",
    icon: Bookmark,
    color: "brand-teal",
    description: "Find any saved link by name or category",
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: Users,
    color: "brand-green",
    description: "Search contacts, departments and email directory",
  },
  {
    href: "/dictionary",
    label: "JP Dictionary",
    icon: BookOpen,
    color: "brand-orange",
    description: "Store and search Japanese words and phrases",
    disabled: true,
  },
  {
    href: "/gmail-labels",
    label: "Gmail Labels",
    icon: Mail,
    color: "#EA4335",
    description: "Pattern-search and manage your Gmail label tree",
  },
  {
    href: "/resources",
    label: "Resources",
    icon: Library,
    color: "brand-teal",
    description: "Every saved guide, link, and file — found by keyword",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    color: "#6E6E73",
    description: "Sync, directories, theme and preferences",
  },
];
