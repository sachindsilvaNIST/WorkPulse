"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type SidebarDensity = "regular" | "compact" | "small";

const STORAGE_KEY = "workpulse.sidebar.density";

interface DensityPreset {
  label: string;
  width: string;
  collapsedWidth: string;
  padding: string;
  rowGap: string;
  rowPadding: string;
  rowText: string;
  iconSize: string;
  iconGlyphSize: string;
  logoSize: string;
  logoGlyphSize: string;
  avatarSize: string;
  avatarText: string;
}

export const SIDEBAR_DENSITY_PRESETS: Record<SidebarDensity, DensityPreset> = {
  regular: {
    label: "Regular",
    width: "w-56",
    collapsedWidth: "w-16",
    padding: "p-2.5",
    rowGap: "gap-2.5",
    rowPadding: "py-1.5",
    rowText: "text-[13px]",
    iconSize: "size-6",
    iconGlyphSize: "size-4",
    logoSize: "size-7",
    logoGlyphSize: "size-4.5",
    avatarSize: "size-6",
    avatarText: "text-[11px]",
  },
  compact: {
    label: "Compact",
    width: "w-48",
    collapsedWidth: "w-14",
    padding: "p-2",
    rowGap: "gap-2",
    rowPadding: "py-1",
    rowText: "text-xs",
    iconSize: "size-5",
    iconGlyphSize: "size-3.5",
    logoSize: "size-6",
    logoGlyphSize: "size-4",
    avatarSize: "size-5",
    avatarText: "text-[10px]",
  },
  small: {
    label: "Small",
    width: "w-40",
    collapsedWidth: "w-12",
    padding: "p-1.5",
    rowGap: "gap-1.5",
    rowPadding: "py-1",
    rowText: "text-[11px]",
    iconSize: "size-4",
    iconGlyphSize: "size-3",
    logoSize: "size-5",
    logoGlyphSize: "size-3.5",
    avatarSize: "size-4",
    avatarText: "text-[9px]",
  },
};

const SidebarDensityContext = createContext<{ density: SidebarDensity; setDensity: (d: SidebarDensity) => void } | null>(null);

/** Shared, localStorage-backed sidebar size preference — a Context (not just localStorage) so
 * that changing it in Settings' Appearance section updates the already-mounted Sidebar
 * immediately, in the same tab, without a reload (a plain localStorage write alone wouldn't
 * re-render a sibling component; the `storage` event only fires in *other* tabs). */
export function SidebarDensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<SidebarDensity>("regular");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "regular" || stored === "compact" || stored === "small") setDensityState(stored);
    } catch {
      /* localStorage unavailable — fall back to the default */
    }
  }, []);

  function setDensity(next: SidebarDensity) {
    setDensityState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* best-effort persistence only */
    }
  }

  return <SidebarDensityContext.Provider value={{ density, setDensity }}>{children}</SidebarDensityContext.Provider>;
}

export function useSidebarDensity() {
  const ctx = useContext(SidebarDensityContext);
  if (!ctx) throw new Error("useSidebarDensity must be used within a SidebarDensityProvider");
  return ctx;
}
