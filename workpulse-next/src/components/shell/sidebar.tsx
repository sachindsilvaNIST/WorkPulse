"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { displayName, logout } = useAuth();

  return (
    <div className="glass-panel flex h-full w-64 flex-col p-4">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0078D4] to-[#004f9e]">
          <Activity className="size-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-base font-semibold tracking-tight">WorkPulse</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={2} />
                {item.label}
                {active && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 -z-10 rounded-xl ring-1 ring-inset ring-primary/25"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-border pt-4">
        <p className="truncate px-2 text-xs text-muted-foreground">{displayName}</p>
        <button
          onClick={logout}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </div>
    </div>
  );
}
