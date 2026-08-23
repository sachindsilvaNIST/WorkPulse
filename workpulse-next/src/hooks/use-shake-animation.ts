"use client";

import { useAnimation } from "framer-motion";

// A damped, decaying oscillation (each swing smaller than the last, and each swing taking longer
// than the previous one) reads as a natural settle rather than a mechanical wobble. Two things
// make it feel slower/gentler than a plain fixed-interval keyframe animation: the explicit `times`
// below space the swings unevenly — tight and quick at the start, stretched out toward the end —
// and the overall duration is long enough (0.85s) that no single swing reads as a "flick".
const SHAKE_KEYFRAMES = { x: [0, -7, 6, -5, 4, -3, 2, -1, 0] };
const SHAKE_TIMES = [0, 0.12, 0.26, 0.4, 0.54, 0.68, 0.8, 0.9, 1];
const SHAKE_TRANSITION = { duration: 0.85, times: SHAKE_TIMES, ease: "easeInOut" as const };

/** Framer Motion `animate` controls for a "reject this input" shake, replayable on demand without
 * remounting the animated element (which would otherwise drop focus/cursor state on a live input). */
export function useShakeAnimation() {
  const controls = useAnimation();

  function shake() {
    void controls.start(SHAKE_KEYFRAMES, SHAKE_TRANSITION);
  }

  return { controls, shake };
}
