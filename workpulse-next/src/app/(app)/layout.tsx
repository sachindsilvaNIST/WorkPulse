"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Activity } from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";
import { SpotlightSearch } from "@/components/shell/spotlight-search";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-context";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { SpotlightProvider } from "@/lib/spotlight-context";
import { settingsApi } from "@/lib/api/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) settingsApi.get().then((s) => setIdleTimeoutMinutes(s.idleTimeoutMinutes)).catch(() => {});
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
          <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-[#0078D4] to-[#004f9e]">
            <Activity className="size-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold">WorkPulse</span>
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

      <main className="flex-1 overflow-y-auto p-4 pt-20 md:p-8 md:pt-8">{children}</main>

      <SpotlightSearch />
    </div>
    </SpotlightProvider>
  );
}
