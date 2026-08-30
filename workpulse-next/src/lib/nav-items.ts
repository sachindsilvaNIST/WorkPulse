import type { ComponentType, SVGProps } from "react";
import {
  HomeGlyph,
  ClockGlyph,
  PageGlyph,
  BriefcaseGlyph,
  TicketGlyph,
  RibbonGlyph,
  PeopleGlyph,
  EnvelopeGlyph,
  BooksGlyph,
  GearGlyph,
} from "@/components/ui/nav-glyphs";

export type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/** NavItem.color is either a literal CSS color ("#D13438") or a "brand-*" token name resolving to
 * the matching --brand-* custom property defined in globals.css — this turns either form into a
 * value usable directly in inline styles / color-mix(). */
export function resolveNavColor(color: string): string {
  return color.startsWith("brand-") ? `var(--${color})` : color;
}

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  color: string; // tailwind text/bg color token suffix, matches brand palette
  /** Second hue for the tile's two-tone Liquid Glass gradient (Apple app-icon style — e.g. orange
   * into pink rather than one flat tint). Falls back to `color` itself when omitted. */
  color2?: string;
  description: string;
  /** Temporarily hidden from the sidebar and Home tiles. The route itself stays live — this is a
   * discoverability toggle, not an access gate — so it's a one-line flip to bring back later. */
  disabled?: boolean;
  /** Use the flat badge (opaque gradient + single highlight, no glass/blur/sheen) instead of the
   * default Liquid Glass treatment — for glyphs that already carry their own depth (e.g. Home's
   * container-panel-plus-tiles), where the glass competed with the glyph rather than helping it. */
  flat?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/home",
    label: "Home",
    icon: HomeGlyph,
    color: "#FFD60A",
    color2: "#FF5500",
    flat: true,
    description: "Your WorkPulse overview",
  },
  {
    href: "/dashboard",
    label: "Attendance",
    icon: ClockGlyph,
    color: "#C9A7FF",
    color2: "#7B42F6",
    flat: true,
    description: "Track login, logout, overtime and monthly reports",
  },
  {
    href: "/reports/daily",
    label: "Daily Reports",
    icon: PageGlyph,
    color: "#FF375F",
    color2: "#BF5AF2",
    flat: true,
    description: "Summarize what you worked on each day",
  },
  {
    href: "/reports/weekly",
    label: "Weekly Reports",
    icon: PageGlyph,
    color: "#FF375F",
    color2: "#BF5AF2",
    flat: true,
    description: "Summarize your weekly progress",
    disabled: true,
  },
  {
    href: "/trips",
    label: "Business Trips",
    icon: BriefcaseGlyph,
    color: "#5E5CE6",
    color2: "#0A84FF",
    flat: true,
    description: "Trip reports, receipts, tickets and documents",
  },
  {
    href: "/reimbursement",
    label: "Reimbursement",
    icon: TicketGlyph,
    color: "#30D9C0",
    color2: "#34C759",
    flat: true,
    description: "Every trip document, found in a second",
  },
  {
    href: "/bookmarks",
    label: "Bookmarks",
    icon: RibbonGlyph,
    color: "#FF6482",
    color2: "#FF3B30",
    flat: true,
    description: "Find any saved link by name or category",
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: PeopleGlyph,
    color: "#7ED957",
    color2: "#248A3D",
    flat: true,
    description: "Search contacts, departments and email directory",
  },
  {
    href: "/dictionary",
    label: "JP Dictionary",
    icon: BooksGlyph,
    color: "#5AC8FA",
    color2: "#0A84FF",
    flat: true,
    description: "Store and search Japanese words and phrases",
    disabled: true,
  },
  {
    href: "/gmail-labels",
    label: "Gmail Labels",
    icon: EnvelopeGlyph,
    color: "#FF6459",
    color2: "#D93025",
    flat: true,
    description: "Pattern-search and manage your Gmail label tree",
  },
  {
    href: "/resources",
    label: "Resources",
    icon: BooksGlyph,
    color: "#5AC8FA",
    color2: "#0A84FF",
    flat: true,
    description: "Every saved guide, link, and file — found by keyword",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: GearGlyph,
    color: "#D1D1D6",
    color2: "#98989D",
    flat: true,
    description: "Sync, directories, theme and preferences",
  },
];
