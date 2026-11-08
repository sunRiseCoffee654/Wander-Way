"use client";

import { useReducedMotion as useMotionReducedMotion } from "motion/react";

/**
 * Returns true if the user has requested reduced motion in their OS settings.
 * Safe for Next.js SSR.
 */
export function useReducedMotion(): boolean {
  const isReduced = useMotionReducedMotion();
  return Boolean(isReduced);
}
