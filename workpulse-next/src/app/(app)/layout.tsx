"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/shell/sidebar";
import { SpotlightSearch } from "@/components/shell/spotlight-search";
import { NotificationBell } from "@/components/shell/notification-bell";
import { Spinner } from "@/components/ui/spinner";
import { IconButton } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { SpotlightProvider } from "@/lib/spotlight-context";
import { SidebarDensityProvider } from "@/lib/sidebar-density-context";
import { settingsApi } from "@/lib/api/client";
import { applyFontSize, FONT_SIZE_STORAGE_KEY } from "@/lib/font-size";
import { useAccent, ACCENT_PRESETS, type AccentId } from "@/lib/accent-context";
import { useGlassIntensity } from "@/lib/glass-intensity-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { setTheme } = useTheme();
  const { setAccent } = useAccent();
  const { setGlassIntensity } = useGlassIntensity();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
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
        if (typeof s.glassIntensity === "number") setGlassIntensity(s.glassIntensity);
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
        <div className="flex h-dvh w-full overflow-hidden lg:gap-4 lg:p-4">
          <div className="hidden shrink-0 lg:block">
            <Sidebar />
          </div>

          <header className="glass-sm fixed inset-x-3 top-3 z-40 flex h-14 items-center gap-2 rounded-pill px-2 lg:hidden">
            <IconButton aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <Menu />
            </IconButton>
            <span className="text-[15px] font-[650] tracking-[-0.01em]">WorkPulse</span>
            <div className="ml-auto">
              <NotificationBell />
            </div>
          </header>

          <Sheet open={mobileOpen} onClose={closeMobile} label="Navigation">
            <div className="glass h-full rounded-panel p-3.5">
              <Sidebar onNavigate={closeMobile} />
            </div>
          </Sheet>

          <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-20 [-webkit-overflow-scrolling:touch] lg:px-6 lg:pt-6">
            {children}
          </main>

          <SpotlightSearch />
        </div>
      </SpotlightProvider>
    </SidebarDensityProvider>
  );
}
