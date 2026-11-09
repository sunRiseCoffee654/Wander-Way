export const VAULT_CATEGORIES = [
  "flights",
  "hotels",
  "passports",
  "insurance",
] as const;

export type VaultDocCategory = (typeof VAULT_CATEGORIES)[number];

export interface DocumentRecord {
  id: string;
  trip_id: string;
  uploaded_by: string;
  title: string;
  category: VaultDocCategory;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
}

export interface NewDocumentInput {
  trip_id: string;
  uploaded_by: string;
  title: string;
  category: VaultDocCategory;
  storage_path: string;
  file_size_bytes: number;
  mime_type: string;
}

/**
 * Formats a clean and deterministic storage path partitioned by trip and category
 */
export function formatStoragePath(
  tripId: string,
  category: string,
  fileName: string
): string {
  const lastDot = fileName.lastIndexOf(".");
  const ext = lastDot !== -1 ? fileName.slice(lastDot) : "";
  const base = lastDot !== -1 ? fileName.slice(0, lastDot) : fileName;

  const cleanBase = base
    .replace(/[^\w-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const cleanExt = ext.replace(/[^\w.]/g, "");

  return `trips/${tripId}/${category}/${cleanBase}${cleanExt}`;
}

/**
 * Generates an expiring signed URL stub for secure vault access
 */
export function generateSignedUrlStub(
  storagePath: string,
  expiresInSeconds: number = 3600
): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  // Generate deterministic pseudo-signature token for verify stub
  const sig = Buffer.from(`${storagePath}:${expires}:ww_vault_secret`).toString("base64url").slice(0, 16);
  return `https://storage.wanderway.app/vault/${encodeURIComponent(storagePath)}?expires=${expires}&sig=${sig}`;
}
