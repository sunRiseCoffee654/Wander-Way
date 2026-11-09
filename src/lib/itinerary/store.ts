import type { Database } from "@/lib/types/database";

export type Activity = Database["public"]["Tables"]["itinerary_activities"]["Row"] & {
  order_index?: number;
};

// In-memory fallback and test cache
export const activityStore = new Map<string, Activity>();

/**
 * Reset memory store (primarily for unit tests and local isolation)
 */
export function resetActivityStoreSync(): void {
  activityStore.clear();
}

export async function resetActivityStore(): Promise<void> {
  activityStore.clear();
}

/**
 * Seed store with activities
 */
export function seedActivityStoreSync(activities: Activity[]): void {
  for (const act of activities) {
    activityStore.set(act.id, {
      ...act,
      order_index: act.order_index ?? act.sort_order,
    });
  }
}

export async function seedActivityStore(activities: Activity[]): Promise<void> {
  seedActivityStoreSync(activities);
}

/**
 * Retrieve activity by id from fallback store
 */
export function getActivityById(activityId: string): Activity | undefined {
  return activityStore.get(activityId);
}

/**
 * Retrieve activities for a given day sorted by sort_order
 */
export function getActivitiesForDay(dayId: string): Activity[] {
  const result: Activity[] = [];
  for (const act of activityStore.values()) {
    if (act.day_id === dayId) {
      result.push(act);
    }
  }
  return result.sort((a, b) => a.sort_order - b.sort_order);
}
