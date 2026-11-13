"use server";

import { createClient } from "@/lib/supabase/server";
import { getIndiaDemoPacking, getKyotoDemoPacking } from "@/lib/ai/packing";

export interface PackingItemRecord {
  id: string;
  trip_id: string;
  category: string;
  item_name: string;
  notes?: string | null;
  quantity?: number;
  is_packed: boolean;
  is_suggested: boolean;
  assigned_to_user_id?: string | null;
  assigned_to_name?: string | null;
  created_by_name?: string | null;
  created_at: string;
}

interface AuthUserStub {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  } | null;
}

const DEMO_ITEMS_CACHE: Record<string, PackingItemRecord[]> = {};

/**
 * Fetch packing list items for a trip
 */
export async function getPackingItems(tripId: string): Promise<PackingItemRecord[]> {
  try {
    const supabase = await createClient();
    if (!tripId.startsWith("mock-")) {
      const { data, error } = await supabase
        .from("packing_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        return data as PackingItemRecord[];
      }
    }
  } catch {
    // Non-request or test environment
  }

  // Return cached or initialized mock items for testing / offline demo
  if (DEMO_ITEMS_CACHE[tripId]) {
    return DEMO_ITEMS_CACHE[tripId];
  }

  // Return empty list for real trips if no packing items saved yet
  if (!tripId.startsWith("mock-")) {
    return [];
  }

  const demoData = tripId.includes("kyoto")
    ? getKyotoDemoPacking()
    : getIndiaDemoPacking("Jaipur, Rajasthan");
  const initialItems: PackingItemRecord[] = demoData.items.map((it, idx) => ({
    id: `pack-${idx + 1}`,
    trip_id: tripId,
    category: it.category,
    item_name: it.item_name,
    notes: it.reason,
    quantity: it.quantity,
    is_packed: false,
    is_suggested: true,
    assigned_to_name: idx % 2 === 0 ? "Aarav Sharma (You)" : "Rohan Mehta",
    created_by_name: "AI Organizer",
    created_at: new Date(Date.now() - idx * 60000).toISOString(),
  }));

  DEMO_ITEMS_CACHE[tripId] = initialItems;
  return initialItems;
}

/**
 * Toggle packed status
 */
export async function togglePackingItem(
  tripId: string,
  itemId: string,
  isPacked: boolean
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    if (!tripId.startsWith("mock-")) {
      await supabase
        .from("packing_items")
        .update({ is_packed: isPacked })
        .eq("id", itemId);
    }
  } catch {
    // Non-request or test environment
  }

  // Update in-memory demo cache if applicable
  if (DEMO_ITEMS_CACHE[tripId]) {
    DEMO_ITEMS_CACHE[tripId] = DEMO_ITEMS_CACHE[tripId].map((item) =>
      item.id === itemId ? { ...item, is_packed: isPacked } : item
    );
  }

  return { success: true };
}

/**
 * Add a custom item contributed by a traveler
 */
export async function addCustomPackingItem(
  tripId: string,
  itemName: string,
  category: string,
  notes?: string,
  quantity: number = 1,
  assignedToName?: string | null,
  createdByName?: string | null
): Promise<PackingItemRecord> {
  let user: AuthUserStub | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = (data?.user as unknown as AuthUserStub) || null;
  } catch {
    // Non-request or test environment
  }

  const author = createdByName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Contributor";

  const newItem: PackingItemRecord = {
    id: `pack-custom-${Date.now()}`,
    trip_id: tripId,
    item_name: itemName,
    category,
    notes: notes || null,
    quantity,
    is_packed: false,
    is_suggested: false,
    assigned_to_name: assignedToName || null,
    created_by_name: author,
    created_at: new Date().toISOString(),
  };

  if (!tripId.startsWith("mock-") && supabase) {
    try {
      const { data, error } = await supabase
        .from("packing_items")
        .insert({
          trip_id: tripId,
          item_name: itemName,
          category,
          notes,
          quantity,
          is_packed: false,
          is_suggested: false,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          ...data,
          assigned_to_name: assignedToName || null,
          created_by_name: author,
        } as PackingItemRecord;
      }
    } catch (e) {
      console.warn("Error inserting packing item:", e);
    }
  }

  if (!DEMO_ITEMS_CACHE[tripId]) {
    DEMO_ITEMS_CACHE[tripId] = [];
  }
  DEMO_ITEMS_CACHE[tripId].unshift(newItem);

  return newItem;
}

/**
 * Assign a packing item to a specific traveler
 */
export async function assignPackingItem(
  tripId: string,
  itemId: string,
  assignedToName: string | null
): Promise<{ success: boolean }> {
  if (DEMO_ITEMS_CACHE[tripId]) {
    DEMO_ITEMS_CACHE[tripId] = DEMO_ITEMS_CACHE[tripId].map((it) =>
      it.id === itemId ? { ...it, assigned_to_name: assignedToName } : it
    );
  }
  return { success: true };
}

/**
 * Delete a packing item
 */
export async function deletePackingItem(
  tripId: string,
  itemId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  if (!tripId.startsWith("mock-")) {
    try {
      await supabase.from("packing_items").delete().eq("id", itemId);
    } catch (e) {
      console.warn("Error deleting packing item:", e);
    }
  }

  if (DEMO_ITEMS_CACHE[tripId]) {
    DEMO_ITEMS_CACHE[tripId] = DEMO_ITEMS_CACHE[tripId].filter(
      (item) => item.id !== itemId
    );
  }

  return { success: true };
}
