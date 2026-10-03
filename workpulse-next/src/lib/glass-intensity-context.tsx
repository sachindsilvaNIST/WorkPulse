"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "workpulse.glassIntensity";
const DEFAULT_INTENSITY = 65;

const GlassIntensityContext = createContext<{
  glassIntensity: number;
  setGlassIntensity: (value: number) => void;
} | null>(null);

export function GlassIntensityProvider({ children }: { children: ReactNode }) {
  const [glassIntensity, setGlassIntensityState] = useState<number>(DEFAULT_INTENSITY);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = Number(stored);
        if (!Number.isNaN(parsed)) setGlassIntensityState(parsed);
      }
    } catch {
      // localStorage unavailable — fall back to the default
    }
  }, []);

  // The stored/backend value keeps its original direction (higher = more tinted), so existing saved
  // values keep their look. The design tokens use the brief's direction (0 = tinted, 1 = clear).
  useEffect(() => {
    document.documentElement.style.setProperty("--glass-intensity", String((100 - glassIntensity) / 100));
  }, [glassIntensity]);

  function setGlassIntensity(next: number) {
    setGlassIntensityState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // localStorage unavailable — value still applies for this session
    }
  }

  return (
    <GlassIntensityContext.Provider value={{ glassIntensity, setGlassIntensity }}>
      {children}
    </GlassIntensityContext.Provider>
  );
}

export function useGlassIntensity() {
  const ctx = useContext(GlassIntensityContext);
  if (!ctx) throw new Error("useGlassIntensity must be used within a GlassIntensityProvider");
  return ctx;
}
