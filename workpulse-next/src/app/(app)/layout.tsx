"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { PulseGlyph } from "@/components/ui/nav-glyphs";
import { Sidebar } from "@/components/shell/sidebar";
import { SpotlightSearch } from "@/components/shell/spotlight-search";
import { NotificationBell } from "@/components/shell/notification-bell";
import { liquidGlassIconStyle, APPLE_ICON_GLYPH_STYLE } from "@/components/ui/icon-badge";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { SpotlightProvider } from "@/lib/spotlight-context";
import { SidebarDensityProvider } from "@/lib/sidebar-density-context";
import { settingsApi } from "@/lib/api/client";
import { applyFontSize, FONT_SIZE_STORAGE_KEY } from "@/lib/font-size";
import { useAccent, ACCENT_PRESETS, type AccentId } from "@/lib/accent-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { setTheme } = useTheme();
  const { setAccent } = useAccent();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  // Single global sync point for every backend-persisted display preference (font size, theme,
  // accent color), run once per login rather than wherever a page happens to fetch AppSettings
  // itself — previously only the Settings page applied font size on its own mount, so opening it
  // could visibly resize the whole app if the backend's stored value differed from whatever
  // localStorage had already painted on load. Syncing here, in the layout every authenticated
  // page shares, means it's already correct by the time any page (including Settings) mounts.
  useEffect(() => {
    if (!isAuthenticated) return;
    settingsApi
      .get()
      .then((s) => {
        setIdleTimeoutMinutes(s.idleTimeoutMinutes);
        applyFontSize(s.fontSizePreset);
        try {
          localStorage.setItem(FONT_SIZE_STORAGE_KEY, s.fontSizePreset);
        } catch {
          /* best-effort cache only */
        }
        const savedTheme = s.themeVariant?.toLowerCase();
        if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") setTheme(savedTheme);
        if (s.accentColor && s.accentColor in ACCENT_PRESETS) setAccent(s.accentColor as AccentId);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useIdleLogout(idleTimeoutMinutes, logout);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={28} className="text-primary" />
      </div>
    );
  }

  return (
    <SidebarDensityProvider>
    <SpotlightProvider>
    <div className="flex h-screen w-full overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden shrink-0 p-3 md:block">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <div className="glass-panel fixed inset-x-0 top-0 z-40 flex items-center gap-3 px-4 py-3 md:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 hover:bg-foreground/5">
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-[22%]" style={liquidGlassIconStyle("#8E8E93", "#636366")}>
            <div className="liquid-sheen pointer-events-none absolute inset-0" />
            <PulseGlyph className="relative size-4 text-white" style={APPLE_ICON_GLYPH_STYLE} />
          </div>
          <span className="text-sm font-semibold">WorkPulse</span>
        </div>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 p-3 md:hidden"
            >
              <div className="relative h-full">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute -right-10 top-2 rounded-full bg-black/40 p-1.5 text-white"
                >
                  <X className="size-4" />
                </button>
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto overscroll-contain p-4 pt-20 [-webkit-overflow-scrolling:touch] md:p-8 md:pt-8">{children}</main>

      <SpotlightSearch />
    </div>
    </SpotlightProvider>
    </SidebarDensityProvider>
  );
}
