import type { Variants } from "motion/react";

export type DaySwitchDirection = 1 | -1;

export const ITINERARY_EASE: [number, number, number, number] = [0.05, 0.7, 0.1, 1.0];
export const ITINERARY_STAGGER_SECONDS = 0.065;
export const ITINERARY_DELAY_CHILDREN_SECONDS = 0.04;

/**
 * Determines directional slide polarity when moving between day numbers.
 * Forward transitions return 1 (enter slightly from right); backward return -1.
 */
export function resolveDaySwitchDirection(
  prevDay: number,
  nextDay: number,
): DaySwitchDirection {
  return nextDay >= prevDay ? 1 : -1;
}

/**
 * Parent container variants for the itinerary day activity list.
 * Coordinates staggered entrance across children when a user switches days.
 */
export function getDayListContainerVariants(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 1 },
      visible: {
        opacity: 1,
        transition: { duration: 0, staggerChildren: 0, delayChildren: 0 },
      },
      exit: {
        opacity: 1,
        transition: { duration: 0 },
      },
    };
  }

  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: ITINERARY_STAGGER_SECONDS,
        delayChildren: ITINERARY_DELAY_CHILDREN_SECONDS,
      },
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: {
        duration: 0.14,
        ease: [0.3, 0.0, 0.8, 0.15],
      },
    },
  };
}

/**
 * Individual itinerary activity item variants triggered by parent stagger orchestration.
 */
export function getDayListItemVariants(
  reducedMotion: boolean,
  direction: DaySwitchDirection = 1,
): Variants {
  if (reducedMotion) {
    return {
      hidden: { opacity: 1, x: 0, y: 0, scale: 1 },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        transition: { duration: 0 },
      },
      exit: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        transition: { duration: 0 },
      },
    };
  }

  return {
    hidden: {
      opacity: 0,
      y: 14,
      x: direction * 10,
      scale: 0.985,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.28,
        ease: ITINERARY_EASE,
      },
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: {
        duration: 0.12,
      },
    },
  };
}
