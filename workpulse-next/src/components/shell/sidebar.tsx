"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut, Search, Settings, ShieldCheck } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";
import { useSpotlight } from "@/lib/spotlight-context";
import { NotificationBell } from "@/components/shell/notification-bell";
import { IconButton } from "@/components/ui/icon-button";
import { useSidebarDensity, SIDEBAR_DENSITY_PRESETS } from "@/lib/sidebar-density-context";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "workpulse.sidebar.collapsed";
const MANAGE_HREFS = new Set(["/shared", "/settings", "/about"]);

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: ShieldCheck,
  color: "#FF6459",
  description: "Manage user accounts and access",
};

/** First + last initial ("Sachin Dsilva" → "SD"), never a single truncated character (G6). Falls
 * back to one initial only when there's genuinely just one name to draw from. */
function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function BrandMark() {
  return (
    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-icon bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 12h4l2-6 4 12 2-6h6" />
      </svg>
    </span>
  );
}

function NavRow({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-item px-2.5 text-[14px] transition-[background-color,transform] duration-[160ms] ease-glass outline-none focus-visible:shadow-focus-ring active:scale-[0.98] motion-reduce:active:scale-100",
        collapsed && "justify-center px-0",
        active
          ? "bg-fill-raised font-semibold text-text-primary shadow-[var(--fill-raised-shadow)]"
          : "font-medium text-text-body hover:bg-fill-1"
      )}
    >
      <Icon
        aria-hidden
        className={cn("size-[18px] shrink-0", active ? "text-primary" : "text-text-tertiary")}
        strokeWidth={active ? 2 : 1.8}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SectionLabel({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2.5 pb-1 pt-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">{children}</p>
      {action}
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { displayName, isAdmin, logout } = useAuth();
  const { setOpen: openSpotlight } = useSpotlight();
  const { density } = useSidebarDensity();
  const preset = SIDEBAR_DENSITY_PRESETS[density];
  const visible = NAV_ITEMS.filter((item) => !item.disabled);
  const workspaceItems = visible.filter((item) => !MANAGE_HREFS.has(item.href));
  const manageItems = visible.filter((item) => MANAGE_HREFS.has(item.href));
  const initials = avatarInitials(displayName || "?");

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* persistence is best-effort */
      }
      return next;
    });
  }

  const isMac = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "glass flex h-full flex-col gap-3.5 rounded-panel p-3.5 transition-[width] duration-200 ease-glass",
        collapsed ? preset.collapsedWidth : preset.width
      )}
    >
      {/* Brand row is icon + two-line text only now (G5) — the bell and collapse toggle used to
          share this row too, which is what made "NIST Workspace" truncate at the default sidebar
          width. Bell moved into the profile card's icon row below; collapse toggle moved to the
          "Workspace" section label row (expanded) or next to Search (collapsed). */}
      <div className={cn("flex items-center gap-2.5 px-1.5 py-1", collapsed && "flex-col")}>
        <BrandMark />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-[650] leading-tight tracking-[-0.01em] text-text-primary">WorkPulse</p>
            <p className="truncate text-xs text-text-secondary">NIST Workspace</p>
          </div>
        )}
      </div>

      {collapsed ? (
        <div className="flex flex-col items-center gap-1.5">
          <IconButton aria-label="Search" title="Search (⌘K)" onClick={() => openSpotlight(true)}>
            <Search />
          </IconButton>
          <IconButton aria-label="Expand sidebar" title="Expand sidebar" onClick={toggleCollapsed} className="size-9">
            <ChevronsRight />
          </IconButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openSpotlight(true)}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-pill bg-fill-1 px-3 text-left text-[13px] text-text-secondary transition-colors hover:bg-fill-2 outline-none focus-visible:shadow-focus-ring"
        >
          <Search className="size-[15px] shrink-0" aria-hidden />
          <span className="flex-1">Search</span>
          <kbd suppressHydrationWarning className="rounded-md bg-fill-2 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-text-tertiary">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
      )}

      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
        {!collapsed && (
          <SectionLabel
            action={
              <IconButton aria-label="Collapse sidebar" title="Collapse sidebar" onClick={toggleCollapsed} className="size-9 [&_svg]:size-4">
                <ChevronsLeft />
              </IconButton>
            }
          >
            Workspace
          </SectionLabel>
        )}
        {workspaceItems.map((item) => (
          <NavRow key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} onNavigate={onNavigate} />
        ))}

        {(manageItems.length > 0 || isAdmin) && (
          <div className="mt-2 flex flex-col gap-0.5">
            {!collapsed && <SectionLabel>Manage</SectionLabel>}
            {manageItems.map((item) => (
              <NavRow key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
            {isAdmin && (
              <NavRow item={ADMIN_NAV_ITEM} active={isActive(ADMIN_NAV_ITEM.href)} collapsed={collapsed} onNavigate={onNavigate} />
            )}
          </div>
        )}
      </nav>

      {/* Two rows now (G6): avatar + name get the row to themselves so the name only ellipsizes
          past the available width instead of being squeezed down to one character by three
          icon buttons sharing its row; those icons (bell, settings, sign-out) moved to their own
          row underneath. Avatar uses token colours (bg-fill-2), not a hard-coded hex. */}
      <div
        className={cn(
          "mt-auto flex flex-col gap-2 rounded-[18px] border border-glass-border bg-white/50 p-2.5 dark:bg-white/[0.06]",
          collapsed && "items-center"
        )}
      >
        <div className={cn("flex items-center gap-2.5", collapsed && "flex-col")}>
          <div
            aria-hidden
            className="flex size-[34px] shrink-0 items-center justify-center rounded-pill bg-fill-2 text-[13px] font-semibold text-text-primary"
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-text-primary">{displayName}</p>
              <p className="truncate text-xs text-text-secondary">WorkPulse Account</p>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-1",
            collapsed ? "flex-col" : "justify-between border-t border-separator pt-2"
          )}
        >
          <NotificationBell align="left" />
          <Link
            href="/settings"
            onClick={onNavigate}
            aria-label="Settings"
            title="Settings"
            className="flex size-9 items-center justify-center rounded-pill text-text-body transition-colors hover:bg-fill-1 outline-none focus-visible:shadow-focus-ring"
          >
            <Settings className="size-[16px]" aria-hidden />
          </Link>
          <IconButton aria-label="Log out" title="Log out" onClick={() => logout()} className="size-9">
            <LogOut />
          </IconButton>
        </div>
      </div>
    </aside>
  );
}
