"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ChevronsLeft, ChevronsRight, LogOut, Search, SlidersHorizontal } from "lucide-react";
import { ShieldGlyph, PulseGlyph } from "@/components/ui/nav-glyphs";
import { NAV_ITEMS, resolveNavColor, type NavItem } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/shell/notification-bell";
import { IconBadge, flatIconStyle, APPLE_ICON_GLYPH_STYLE, SQUIRCLE_CLIP_PATH } from "@/components/ui/icon-badge";
import { useSidebarDensity, SIDEBAR_DENSITY_PRESETS } from "@/lib/sidebar-density-context";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "workpulse.sidebar.collapsed";

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: ShieldGlyph,
  color: "#FF6459",
  color2: "#D70015",
  flat: true,
  description: "Manage user accounts and access",
};

function NavRow({
  item,
  active,
  collapsed,
  onNavigate,
  preset,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  preset: (typeof SIDEBAR_DENSITY_PRESETS)["regular"];
}) {
  return (
    <Link href={item.href} onClick={onNavigate} className="block" title={collapsed ? item.label : undefined}>
      {/* Selected-row fill — the user's chosen accent color (var(--primary), set by
          AccentProvider), same as macOS System Settings' own sidebar selection (not a per-item
          tinted highlight) so only one row ever reads as "current", and matching exactly how the
          Settings page's own left-nav applies its active background: directly on the row element
          itself, not via a separate absolutely-positioned overlay div — that overlay approach was
          intermittently failing to paint (reproducing on whichever route was current), and this
          more direct method is the one already proven working on the Settings page. */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn(
          "group flex items-center rounded-lg font-medium transition-colors",
          preset.rowGap,
          preset.rowPadding,
          preset.rowText,
          collapsed ? "justify-center px-2" : "pl-2 pr-2.5",
          active ? "text-white" : "text-foreground/65 hover:bg-foreground/6 hover:text-foreground"
        )}
        style={active ? { backgroundColor: "var(--primary)" } : undefined}
      >
        <IconBadge
          icon={item.icon}
          color={resolveNavColor(item.color)}
          color2={item.color2 ? resolveNavColor(item.color2) : undefined}
          size={preset.iconSize}
          iconSize={preset.iconGlyphSize}
          flat={item.flat}
          className="transition-transform duration-200 group-hover:scale-105"
        />

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
  const { density } = useSidebarDensity();
  const preset = SIDEBAR_DENSITY_PRESETS[density];
  const allItems = NAV_ITEMS.filter((item) => !item.disabled);
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  const [navQuery, setNavQuery] = useState("");
  const items = navQuery.trim()
    ? allItems.filter((item) => item.label.toLowerCase().includes(navQuery.trim().toLowerCase()))
    : allItems;

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
    <div className={cn("sidebar-panel flex h-full flex-col transition-[width] duration-200", preset.padding, collapsed ? preset.collapsedWidth : preset.width)}>
      <div className={cn("mb-3 flex items-center gap-2 px-0.5", collapsed && "flex-col gap-3")}>
        <div className="flex items-center gap-2">
          <div
            className={cn("relative flex shrink-0 items-center justify-center text-white", preset.logoSize)}
            style={{ ...flatIconStyle("#0078D4", "#004f9e"), clipPath: SQUIRCLE_CLIP_PATH }}
          >
            <PulseGlyph className={cn(preset.logoGlyphSize, "relative")} style={APPLE_ICON_GLYPH_STYLE} />
          </div>
          {!collapsed && <span className="text-sm font-semibold tracking-tight">WorkPulse</span>}
        </div>
        <div className={cn("flex items-center gap-1", !collapsed && "ml-auto")}>
          <NotificationBell align="left" />
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

      {/* Search — filters the nav list below, same as macOS System Settings' own sidebar search.
          Hidden collapsed (icon-only) since there's no room and nothing to type into. */}
      {!collapsed && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
            placeholder="Search"
            className="h-8 w-full rounded-full border border-transparent bg-foreground/6 pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-input"
          />
        </div>
      )}

      {/* Account — moved to the top, above the nav list, matching macOS System Settings' own
          sidebar layout (avatar + name + account-type subtitle right under the search field). */}
      <div className="relative mb-3" ref={accountRef}>
        <button
          type="button"
          onClick={() => setAccountMenuOpen((v) => !v)}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-foreground/6",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? displayName || undefined : undefined}
        >
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0078D4] to-[#004f9e] font-semibold text-white",
              preset.avatarSize,
              preset.avatarText
            )}
          >
            {initial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">WorkPulse Account</p>
            </div>
          )}
        </button>

        <AnimatePresence>
          {accountMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="glass-panel absolute top-full left-0 z-20 mt-2 w-48 overflow-hidden p-1.5"
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

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {items.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
            collapsed={collapsed}
            onNavigate={onNavigate}
            preset={preset}
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
              preset={preset}
            />
          </>
        )}
      </nav>
    </div>
  );
}
