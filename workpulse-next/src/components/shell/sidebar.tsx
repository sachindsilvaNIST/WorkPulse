"use client";

import { useState } from "react";
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

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">{children}</p>
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
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

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
      <div className={cn("flex items-center gap-2.5 px-1.5 py-1", collapsed && "flex-col")}>
        <BrandMark />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-[650] leading-tight tracking-[-0.01em] text-text-primary">WorkPulse</p>
            <p className="truncate text-xs text-text-secondary">NIST Workspace</p>
          </div>
        )}
        <div className={cn("flex items-center", collapsed && "flex-col")}>
          <NotificationBell align="left" />
          <IconButton
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
            className="size-9"
          >
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </IconButton>
        </div>
      </div>

      {collapsed ? (
        <IconButton aria-label="Search" title="Search (⌘K)" onClick={() => openSpotlight(true)} className="mx-auto">
          <Search />
        </IconButton>
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
        {!collapsed && <SectionLabel>Workspace</SectionLabel>}
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

      <div
        className={cn(
          "mt-auto flex items-center gap-2.5 rounded-[18px] border border-glass-border bg-white/50 p-2.5 dark:bg-white/[0.06]",
          collapsed && "flex-col p-2"
        )}
      >
        <div
          aria-hidden
          className="flex size-[34px] shrink-0 items-center justify-center rounded-pill bg-[#2C2C30] text-[13px] font-semibold text-white"
        >
          {initial}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-text-primary">{displayName}</p>
            <p className="truncate text-xs text-text-secondary">WorkPulse Account</p>
          </div>
        )}
        <Link
          href="/settings"
          onClick={onNavigate}
          aria-label="Settings"
          title="Settings"
          className="flex size-11 items-center justify-center rounded-pill text-text-body transition-colors hover:bg-fill-1 outline-none focus-visible:shadow-focus-ring"
        >
          <Settings className="size-[17px]" aria-hidden />
        </Link>
        <IconButton aria-label="Log out" title="Log out" onClick={() => logout()} className={cn(collapsed && "size-9")}>
          <LogOut />
        </IconButton>
      </div>
    </aside>
  );
}
