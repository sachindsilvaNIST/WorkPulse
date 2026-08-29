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
  /** Second hue for the tile's two-tone Liquid Glass gradient (Apple app-icon style — e.g. orange
   * into pink rather than one flat tint). Falls back to `color` itself when omitted. */
  color2?: string;
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
    color: "#0A84FF",
    color2: "#5E5CE6",
    description: "Your WorkPulse overview",
  },
  {
    href: "/dashboard",
    label: "Attendance",
    icon: CalendarClock,
    color: "#5E5CE6",
    color2: "#AF52DE",
    description: "Track login, logout, overtime and monthly reports",
  },
  {
    href: "/reports/daily",
    label: "Daily Reports",
    icon: FileText,
    color: "#FF9F0A",
    color2: "#FF375F",
    description: "Summarize what you worked on each day",
  },
  {
    href: "/reports/weekly",
    label: "Weekly Reports",
    icon: CalendarRange,
    color: "#32ADE6",
    color2: "#5E5CE6",
    description: "Summarize your weekly progress",
    disabled: true,
  },
  {
    href: "/trips",
    label: "Business Trips",
    icon: Briefcase,
    color: "#AF52DE",
    color2: "#FF375F",
    description: "Trip reports, receipts, tickets and documents",
  },
  {
    href: "/reimbursement",
    label: "Reimbursement",
    icon: Receipt,
    color: "#FF375F",
    color2: "#FF9F0A",
    description: "Every trip document, found in a second",
  },
  {
    href: "/bookmarks",
    label: "Bookmarks",
    icon: Bookmark,
    color: "#FFD60A",
    color2: "#FF9F0A",
    description: "Find any saved link by name or category",
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: Users,
    color: "#30D158",
    color2: "#40C8E0",
    description: "Search contacts, departments and email directory",
  },
  {
    href: "/dictionary",
    label: "JP Dictionary",
    icon: BookOpen,
    color: "#AC8E68",
    color2: "#FF9F0A",
    description: "Store and search Japanese words and phrases",
    disabled: true,
  },
  {
    href: "/gmail-labels",
    label: "Gmail Labels",
    icon: Mail,
    color: "#FF453A",
    color2: "#FF375F",
    description: "Pattern-search and manage your Gmail label tree",
  },
  {
    href: "/resources",
    label: "Resources",
    icon: Library,
    color: "#40C8E0",
    color2: "#5E5CE6",
    description: "Every saved guide, link, and file — found by keyword",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    color: "#8E8E93",
    color2: "#5E5CE6",
    description: "Sync, directories, theme and preferences",
  },
];
