"use client";

import { useState } from "react";

const SLOW_THRESHOLD_MS = 4000;

/** Tracks whether an in-flight request has crossed a "this is taking a while" threshold — used to
 * surface a cold-start hint (Render's free tier spins the API down after 15 min idle) without
 * flashing that message on every normal, fast request. */
export function useSlowRequest() {
  const [slow, setSlow] = useState(false);

  async function run<T>(fn: () => Promise<T>): Promise<T> {
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), SLOW_THRESHOLD_MS);
    try {
      return await fn();
    } finally {
      clearTimeout(timer);
      setSlow(false);
    }
  }

  return { slow, run };
}
