"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ChevronRight, ChevronsLeft, ChevronsRight, LogOut, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { NAV_ITEMS, resolveNavColor, type NavItem } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/shell/notification-bell";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "workpulse.sidebar.collapsed";

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: ShieldCheck,
  color: "#FF3B30",
  description: "Manage user accounts and access",
};

function NavRow({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const color = resolveNavColor(item.color);

  return (
    <Link href={item.href} onClick={onNavigate} className="block" title={collapsed ? item.label : undefined}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition-colors",
          collapsed ? "justify-center px-2" : "pl-2.5 pr-3",
          active ? "text-foreground" : "text-foreground/65 hover:text-foreground"
        )}
      >
        {active && (
          <motion.div
            layoutId="nav-active-pill"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="absolute inset-0 -z-10 rounded-xl"
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 28%, transparent)`,
            }}
          />
        )}
        {!active && (
          <div className="absolute inset-0 -z-10 rounded-xl bg-foreground/0 transition-colors duration-150 group-hover:bg-foreground/6" />
        )}

        {/* Active accent bar — a small colored tab bleeding into the row's own left padding, not
            the sidebar's outer padding, so nothing here competes with the container's margin. */}
        {!collapsed && (
          <span
            className={cn("absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200", active ? "opacity-100" : "opacity-0")}
            style={{ backgroundColor: color }}
          />
        )}

        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} ${active ? 20 : 12}%, transparent)`,
            color,
          }}
        >
          <Icon className="size-4" strokeWidth={2.25} />
        </div>

        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 text-foreground/30 transition-all duration-200",
                active ? "opacity-0" : "opacity-0 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
              )}
            />
          </>
        )}
      </motion.div>
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { displayName, isAdmin, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.disabled);
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
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) setAccountMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  return (
    <div className={cn("glass-panel flex h-full flex-col p-3 transition-[width] duration-200", collapsed ? "w-[72px]" : "w-64")}>
      <div className={cn("mb-6 flex items-center gap-2.5 px-1", collapsed && "flex-col gap-3")}>
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0078D4] to-[#004f9e] shadow-sm shadow-blue-500/30">
            <Activity className="size-4 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && <span className="text-base font-semibold tracking-tight">WorkPulse</span>}
        </div>
        <div className={cn("flex items-center gap-1", !collapsed && "ml-auto")}>
          <NotificationBell />
          <button
            type="button"
            onClick={toggleCollapsed}
            className="cursor-pointer rounded-lg p-1.5 text-foreground/50 transition-colors hover:bg-foreground/8 hover:text-foreground"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}

        {isAdmin && (
          <>
            <div className="my-2 border-t border-border/60" />
            <NavRow
              item={ADMIN_NAV_ITEM}
              active={pathname === ADMIN_NAV_ITEM.href || pathname.startsWith(ADMIN_NAV_ITEM.href + "/")}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </>
        )}
      </nav>

      <div className="mt-4 border-t border-border pt-4" ref={accountRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountMenuOpen((v) => !v)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-foreground/6",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? displayName || undefined : undefined}
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0078D4] to-[#004f9e] text-xs font-semibold text-white">
              {initial}
            </div>
            {!collapsed && <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">{displayName}</p>}
          </button>

          <AnimatePresence>
            {accountMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="glass-panel absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden p-1.5"
              >
                <Link
                  href="/settings"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onNavigate?.();
                  }}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/8 hover:text-foreground"
                >
                  <SlidersHorizontal className="size-4" />
                  Preferences
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-4" />
                  Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
