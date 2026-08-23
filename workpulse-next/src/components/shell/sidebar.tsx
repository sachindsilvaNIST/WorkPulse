"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { NAV_ITEMS, resolveNavColor, type NavItem } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: ShieldCheck,
  color: "#FF3B30",
  description: "Manage user accounts and access",
};

function NavRow({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const color = resolveNavColor(item.color);

  return (
    <Link href={item.href} onClick={onNavigate} className="block">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl py-2 pl-2.5 pr-3 text-sm font-medium transition-colors",
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
        <span
          className={cn("absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200", active ? "opacity-100" : "opacity-0")}
          style={{ backgroundColor: color }}
        />

        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} ${active ? 20 : 12}%, transparent)`,
            color,
          }}
        >
          <Icon className="size-4" strokeWidth={2.25} />
        </div>

        <span className="flex-1 truncate">{item.label}</span>

        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-foreground/30 transition-all duration-200",
            active ? "opacity-0" : "opacity-0 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
          )}
        />
      </motion.div>
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { displayName, isAdmin, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.disabled);
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="glass-panel flex h-full w-64 flex-col p-4">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0078D4] to-[#004f9e] shadow-sm shadow-blue-500/30">
          <Activity className="size-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-base font-semibold tracking-tight">WorkPulse</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
            onNavigate={onNavigate}
          />
        ))}

        {isAdmin && (
          <>
            <div className="my-2 border-t border-border/60" />
            <NavRow
              item={ADMIN_NAV_ITEM}
              active={pathname === ADMIN_NAV_ITEM.href || pathname.startsWith(ADMIN_NAV_ITEM.href + "/")}
              onNavigate={onNavigate}
            />
          </>
        )}
      </nav>

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0078D4] to-[#004f9e] text-xs font-semibold text-white">
            {initial}
          </div>
          <p className="truncate text-xs font-medium text-muted-foreground">{displayName}</p>
        </div>
        <button
          onClick={logout}
          className="group mt-2 flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Log out
        </button>
      </div>
    </div>
  );
}
