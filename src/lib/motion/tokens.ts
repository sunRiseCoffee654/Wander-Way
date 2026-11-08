/**
 * WanderWay Motion Tokens & Easing Curves
 * Material 3 Travel Companion animation profiles
 */

export const SPRING_SNAPPY = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const SPRING_GENTLE = {
  type: "spring" as const,
  stiffness: 220,
  damping: 26,
  mass: 1,
};

export const SPRING_BOUNCY = {
  type: "spring" as const,
  stiffness: 360,
  damping: 18,
  mass: 0.9,
};

export const TRANSITION_ENTER = {
  duration: 0.35,
  ease: [0.05, 0.7, 0.1, 1.0], // Material 3 Decelerate
};

export const TRANSITION_EXIT = {
  duration: 0.2,
  ease: [0.3, 0.0, 0.8, 0.15], // Material 3 Accelerate
};

export const TRANSITION_STANDARD = {
  duration: 0.25,
  ease: [0.2, 0.0, 0.0, 1.0], // Material 3 Standard
};

// Common Motion Variants
export const FADE_IN_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: TRANSITION_ENTER },
  exit: { opacity: 0, y: -8, transition: TRANSITION_EXIT },
};

export const SCALE_SPRING = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1, transition: SPRING_SNAPPY },
  exit: { opacity: 0, scale: 0.96, transition: TRANSITION_EXIT },
};

export const STAGGER_CONTAINER = (staggerChildren = 0.06, delayChildren = 0.05) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});
