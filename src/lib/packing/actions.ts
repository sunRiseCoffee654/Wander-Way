"use server";

import { createClient } from "@/lib/supabase/server";
import { getKyotoDemoPacking } from "@/lib/ai/packing";

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
  created_at: string;
}

const DEMO_ITEMS_CACHE: Record<string, PackingItemRecord[]> = {};

/**
 * Fetch packing list items for a trip
 */
export async function getPackingItems(tripId: string): Promise<PackingItemRecord[]> {
  const supabase = await createClient();

  if (!tripId.startsWith("mock-")) {
    try {
      const { data, error } = await supabase
        .from("packing_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        return data as PackingItemRecord[];
      }
    } catch (e) {
      console.warn("Could not fetch packing items from Supabase:", e);
    }
  }

  // Return cached or initialized demo items
  if (DEMO_ITEMS_CACHE[tripId]) {
    return DEMO_ITEMS_CACHE[tripId];
  }

  const demoData = getKyotoDemoPacking();
  const initialItems: PackingItemRecord[] = demoData.items.map((it, idx) => ({
    id: `pack-${idx + 1}`,
    trip_id: tripId,
    category: it.category,
    item_name: it.item_name,
    notes: it.reason,
    quantity: it.quantity,
    is_packed: idx === 0 || idx === 3, // Pre-check umbrella & walking shoes for nice visual
    is_suggested: true,
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
  const supabase = await createClient();

  if (!tripId.startsWith("mock-")) {
    try {
      await supabase
        .from("packing_items")
        .update({ is_packed: isPacked })
        .eq("id", itemId);
    } catch (e) {
      console.warn("Error updating packing item status:", e);
    }
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
 * Add a custom item
 */
export async function addCustomPackingItem(
  tripId: string,
  itemName: string,
  category: string,
  notes?: string,
  quantity: number = 1
): Promise<PackingItemRecord> {
  const supabase = await createClient();

  const newItem: PackingItemRecord = {
    id: `pack-custom-${Date.now()}`,
    trip_id: tripId,
    item_name: itemName,
    category,
    notes: notes || null,
    quantity,
    is_packed: false,
    is_suggested: false,
    created_at: new Date().toISOString(),
  };

  if (!tripId.startsWith("mock-")) {
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
        return data as PackingItemRecord;
      }
    } catch (e) {
      console.warn("Error inserting packing item:", e);
    }
  }

  if (!DEMO_ITEMS_CACHE[tripId]) {
    DEMO_ITEMS_CACHE[tripId] = [];
  }
  DEMO_ITEMS_CACHE[tripId].push(newItem);

  return newItem;
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
