"use client";

import { createContext, useContext, useState } from "react";

interface SpotlightContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SpotlightContext = createContext<SpotlightContextValue | null>(null);

export function SpotlightProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SpotlightContext.Provider value={{ open, setOpen }}>{children}</SpotlightContext.Provider>;
}

export function useSpotlight() {
  const ctx = useContext(SpotlightContext);
  if (!ctx) throw new Error("useSpotlight must be used within SpotlightProvider");
  return ctx;
}
