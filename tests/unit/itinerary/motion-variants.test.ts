import { describe, expect, it } from "vitest";
import {
  ITINERARY_DELAY_CHILDREN_SECONDS,
  ITINERARY_STAGGER_SECONDS,
  getDayListContainerVariants,
  getDayListItemVariants,
  resolveDaySwitchDirection,
} from "@/lib/itinerary/motion-variants";

describe("Itinerary day switch Framer Motion variants", () => {
  it("computes directional polarity when moving forward vs backward across days", () => {
    expect(resolveDaySwitchDirection(1, 2)).toBe(1);
    expect(resolveDaySwitchDirection(1, 3)).toBe(1);
    expect(resolveDaySwitchDirection(3, 1)).toBe(-1);
    expect(resolveDaySwitchDirection(2, 2)).toBe(1);
  });

  it("configures staggered child entrances when reducedMotion is false", () => {
    const container = getDayListContainerVariants(false);
    const visible = container.visible as {
      opacity: number;
      transition: { staggerChildren: number; delayChildren: number };
    };
    const hidden = container.hidden as { opacity: number };

    expect(hidden.opacity).toBe(0);
    expect(visible.opacity).toBe(1);
    expect(visible.transition.staggerChildren).toBe(ITINERARY_STAGGER_SECONDS);
    expect(visible.transition.staggerChildren).toBeGreaterThan(0);
    expect(visible.transition.delayChildren).toBe(ITINERARY_DELAY_CHILDREN_SECONDS);
  });

  it("applies directional slide offsets and subtle vertical lift on activity items", () => {
    const forwardItem = getDayListItemVariants(false, 1);
    const backwardItem = getDayListItemVariants(false, -1);

    const forwardHidden = forwardItem.hidden as { opacity: number; x: number; y: number };
    const backwardHidden = backwardItem.hidden as { opacity: number; x: number; y: number };
    const visible = forwardItem.visible as { opacity: number; x: number; y: number; scale: number };

    expect(forwardHidden.opacity).toBe(0);
    expect(forwardHidden.y).toBeGreaterThan(0);
    expect(forwardHidden.x).toBeGreaterThan(0);
    expect(backwardHidden.x).toBeLessThan(0);
    expect(visible.opacity).toBe(1);
    expect(visible.x).toBe(0);
    expect(visible.y).toBe(0);
    expect(visible.scale).toBe(1);
  });

  it("disables stagger, displacement, and durations when user prefers reduced motion", () => {
    const container = getDayListContainerVariants(true);
    const item = getDayListItemVariants(true, 1);

    const containerVisible = container.visible as {
      transition: { staggerChildren: number; duration: number };
    };
    const itemHidden = item.hidden as { opacity: number; x: number; y: number };
    const itemVisible = item.visible as { transition: { duration: number } };

    expect(containerVisible.transition.staggerChildren).toBe(0);
    expect(containerVisible.transition.duration).toBe(0);
    expect(itemHidden.opacity).toBe(1);
    expect(itemHidden.x).toBe(0);
    expect(itemHidden.y).toBe(0);
    expect(itemVisible.transition.duration).toBe(0);
  });
});
