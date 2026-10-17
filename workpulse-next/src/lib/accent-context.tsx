"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";

export type AccentId = "blue" | "purple" | "teal" | "orange" | "rose" | "green";

/** Curated accent presets — reuses the existing --brand-* palette from globals.css rather than a
 * free-form picker, so every choice is guaranteed readable (white text on top, sufficient
 * contrast against both --background surfaces) in both themes. Each has its own light/dark value,
 * matching the existing brand-blue/brand-blue-2 split (dark mode gets a touch brighter so the
 * accent doesn't read as muddy against the darker surfaces). */
export const ACCENT_PRESETS: Record<AccentId, { label: string; light: string; dark: string }> = {
  blue: { label: "Blue", light: "#0078d4", dark: "#007aff" },
  purple: { label: "Purple", light: "#7a3fd1", dark: "#a78bfa" },
  teal: { label: "Teal", light: "#00c7be", dark: "#26d9ce" },
  orange: { label: "Orange", light: "#ff9500", dark: "#ffb340" },
  rose: { label: "Rose", light: "#ff2d55", dark: "#ff375f" },
  green: { label: "Green", light: "#248a3d", dark: "#30d158" },
};

const STORAGE_KEY = "workpulse.accentColor";

/** Fixed per-preset foreground (G1) — not computed at runtime. Raw WCAG contrast ratio doesn't
 * track human perception for saturated hues: for our default Blue in dark mode (#007aff), white
 * measures 4.02:1 and near-black measures 4.19:1 against it — a 4% difference that made a
 * "pick whichever ratio is higher" rule choose near-black, which reads far worse in practice than
 * white does despite the marginally lower number. These values were chosen by computing real
 * contrast ratios for all 12 (preset × theme) colors and preferring white unless near-black wins
 * by a clear margin (either white fails 4.5:1 while near-black passes, or near-black's ratio is
 * at least ~15% higher) — see the accent-context contrast audit in project notes for the numbers. */
const ACCENT_FOREGROUND: Record<AccentId, { light: string; dark: string }> = {
  blue: { light: "#ffffff", dark: "#ffffff" },
  purple: { light: "#ffffff", dark: "#1d1d1f" },
  teal: { light: "#1d1d1f", dark: "#1d1d1f" },
  orange: { light: "#1d1d1f", dark: "#1d1d1f" },
  rose: { light: "#1d1d1f", dark: "#1d1d1f" },
  green: { light: "#ffffff", dark: "#1d1d1f" },
};

const AccentContext = createContext<{ accent: AccentId; setAccent: (a: AccentId) => void } | null>(null);

/** App-wide accent color — sets --primary/--ring as inline styles on the root element, which
 * `--color-primary`/`--color-ring` (globals.css's @theme inline block) and every `bg-primary`/
 * `text-primary`/`ring-*` Tailwind class already reads from, plus the sidebar/Settings selected-
 * row highlight (both now read `var(--primary)` instead of a hardcoded Apple-blue). Re-applies
 * whenever the accent choice or the resolved light/dark theme changes, since each preset carries
 * a different value per theme. */
export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>("blue");
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored in ACCENT_PRESETS) setAccentState(stored as AccentId);
    } catch {
      /* localStorage unavailable — fall back to the default */
    }
  }, []);

  useEffect(() => {
    const preset = ACCENT_PRESETS[accent];
    const isDark = resolvedTheme === "dark";
    const color = isDark ? preset.dark : preset.light;
    const foreground = isDark ? ACCENT_FOREGROUND[accent].dark : ACCENT_FOREGROUND[accent].light;
    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--accent-foreground", foreground);
  }, [accent, resolvedTheme]);

  function setAccent(next: AccentId) {
    setAccentState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* best-effort persistence only */
    }
  }

  return <AccentContext.Provider value={{ accent, setAccent }}>{children}</AccentContext.Provider>;
}

export function useAccent() {
  const ctx = useContext(AccentContext);
  if (!ctx) throw new Error("useAccent must be used within an AccentProvider");
  return ctx;
}
