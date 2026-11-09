"use server";

import { createClient } from "@/lib/supabase/server";
import { cacheVaultOffline } from "@/lib/offline/storage";
import {
  type DocumentRecord,
  type NewDocumentInput,
  type VaultDocCategory,
} from "./helpers";

export type { DocumentRecord, NewDocumentInput, VaultDocCategory };

// In-memory store for test runs and demo trips
const VAULT_STORE = new Map<string, DocumentRecord>();

/**
 * Resets memory store for unit testing
 */
export async function resetVaultStore(): Promise<void> {
  VAULT_STORE.clear();
}

/**
 * Server action: Create a new document in vault
 */
export async function createDocumentAction(
  docData: NewDocumentInput
): Promise<{ success: boolean; document?: DocumentRecord; error?: string }> {
  try {
    if (
      !docData.trip_id ||
      !docData.uploaded_by ||
      !docData.title ||
      !docData.category ||
      !docData.storage_path ||
      docData.file_size_bytes <= 0 ||
      !docData.mime_type
    ) {
      return { success: false, error: "All document metadata fields are required." };
    }

    const newDoc: DocumentRecord = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      trip_id: docData.trip_id,
      uploaded_by: docData.uploaded_by,
      title: docData.title.trim(),
      category: docData.category,
      storage_path: docData.storage_path,
      file_size_bytes: docData.file_size_bytes,
      mime_type: docData.mime_type,
      created_at: new Date().toISOString(),
    };

    VAULT_STORE.set(newDoc.id, newDoc);

    // Sync to Supabase if connected
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("documents")
        .insert({
          id: newDoc.id,
          trip_id: newDoc.trip_id,
          uploaded_by: newDoc.uploaded_by,
          title: newDoc.title,
          category: newDoc.category,
          storage_path: newDoc.storage_path,
          file_size_bytes: newDoc.file_size_bytes,
          mime_type: newDoc.mime_type,
        })
        .select()
        .single();

      if (!error && data) {
        return { success: true, document: data as DocumentRecord };
      }
    } catch {
      // Graceful fallback to memory store
    }

    // Mirror to offline cache if on client
    try {
      const tripDocs = Array.from(VAULT_STORE.values()).filter(
        (d) => d.trip_id === docData.trip_id
      );
      cacheVaultOffline(docData.trip_id, tripDocs);
    } catch {
      // Ignored in non-browser context
    }

    return { success: true, document: newDoc };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record document";
    return { success: false, error: message };
  }
}

/**
 * Server action: Update document category tag
 */
export async function updateDocumentCategoryAction(
  id: string,
  category: VaultDocCategory
): Promise<{ success: boolean; document?: DocumentRecord; error?: string }> {
  try {
    const existing = VAULT_STORE.get(id);
    if (!existing) {
      // Try fetching from Supabase
      try {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("documents")
          .update({ category })
          .eq("id", id)
          .select()
          .single();

        if (!error && data) {
          const rec = data as DocumentRecord;
          VAULT_STORE.set(rec.id, rec);
          return { success: true, document: rec };
        }
      } catch {
        // Fall through
      }
      return { success: false, error: "Document not found." };
    }

    existing.category = category;
    VAULT_STORE.set(id, existing);

    try {
      const supabase = await createClient();
      await supabase.from("documents").update({ category }).eq("id", id);
    } catch {
      // Retain memory state
    }

    return { success: true, document: existing };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update category";
    return { success: false, error: message };
  }
}

/**
 * Server action: Delete a document from vault
 */
export async function deleteDocumentAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = VAULT_STORE.get(id);
    const tripId = existing?.trip_id;

    VAULT_STORE.delete(id);

    try {
      const supabase = await createClient();
      await supabase.from("documents").delete().eq("id", id);
    } catch {
      // Ignored
    }

    if (tripId) {
      try {
        const remaining = Array.from(VAULT_STORE.values()).filter(
          (d) => d.trip_id === tripId
        );
        cacheVaultOffline(tripId, remaining);
      } catch {
        // Ignored
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete document";
    return { success: false, error: message };
  }
}

/**
 * Server action: Fetch all documents for a trip
 */
export async function getVaultDocumentsAction(
  tripId: string
): Promise<{ success: boolean; documents: DocumentRecord[]; error?: string }> {
  try {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return { success: true, documents: data as DocumentRecord[] };
      }
    } catch {
      // Fall through to memory store
    }

    const docs = Array.from(VAULT_STORE.values()).filter(
      (d) => d.trip_id === tripId
    );

    return { success: true, documents: docs };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch documents";
    return { success: false, documents: [], error: message };
  }
}
