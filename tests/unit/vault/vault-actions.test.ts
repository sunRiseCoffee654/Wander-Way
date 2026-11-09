import { describe, it, expect, beforeEach } from "vitest";
import {
  createDocumentAction,
  deleteDocumentAction,
  updateDocumentCategoryAction,
  getVaultDocumentsAction,
  resetVaultStore,
} from "@/lib/vault/actions";
import {
  formatStoragePath,
  generateSignedUrlStub,
  type NewDocumentInput,
  type VaultDocCategory,
  VAULT_CATEGORIES,
} from "@/lib/vault/helpers";

describe("Document Vault Actions & Storage Utilities", () => {
  const tripId = "trip-test-vault-99";
  const userId = "usr-test-alex";

  beforeEach(() => {
    resetVaultStore();
  });

  describe("Document Upload Record Creation & Categories", () => {
    it("creates document records across all 4 vault categories with file metadata", async () => {
      const categories: VaultDocCategory[] = ["flights", "hotels", "passports", "insurance"];
      expect(VAULT_CATEGORIES).toEqual(categories);

      for (const cat of categories) {
        const input: NewDocumentInput = {
          trip_id: tripId,
          uploaded_by: userId,
          title: `Document for ${cat}`,
          category: cat,
          storage_path: formatStoragePath(tripId, cat, `file_${cat}.pdf`),
          file_size_bytes: 1024 * 512, // 512 KB
          mime_type: "application/pdf",
        };

        const res = await createDocumentAction(input);
        expect(res.success).toBe(true);
        expect(res.document).toBeDefined();
        expect(res.document?.category).toBe(cat);
        expect(res.document?.title).toBe(`Document for ${cat}`);
        expect(res.document?.file_size_bytes).toBe(524288);
        expect(res.document?.mime_type).toBe("application/pdf");
        expect(res.document?.storage_path).toContain(tripId);
      }

      const all = await getVaultDocumentsAction(tripId);
      expect(all.documents.length).toBe(4);
    });

    it("rejects document creation missing essential metadata", async () => {
      const invalid = {
        trip_id: "",
        uploaded_by: "",
        title: "",
        category: "flights" as VaultDocCategory,
        storage_path: "",
        file_size_bytes: 0,
        mime_type: "",
      };

      const res = await createDocumentAction(invalid);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe("Storage Path Formatting & Signed URL Generation Stub", () => {
    it("formats secure sanitized storage paths partitioned by trip and category", () => {
      const path = formatStoragePath("trip-456", "flights", "Boarding Pass #1 (Final).pdf");
      expect(path).toBe("trips/trip-456/flights/Boarding_Pass_1_Final.pdf");
    });

    it("generates verifiable signed URL stubs with expiration timestamp and signature", () => {
      const storagePath = "trips/trip-123/hotels/voucher.pdf";
      const signedUrl = generateSignedUrlStub(storagePath, 3600);

      expect(signedUrl).toContain("https://storage.wanderway.app/vault/");
      expect(signedUrl).toContain("expires=");
      expect(signedUrl).toContain("sig=");
      expect(signedUrl).toContain(encodeURIComponent(storagePath));
    });
  });

  describe("Document Category Tag Updates & Deletion", () => {
    it("updates document category tags dynamically", async () => {
      const createRes = await createDocumentAction({
        trip_id: tripId,
        uploaded_by: userId,
        title: "JR Pass Voucher",
        category: "flights", // mistakenly marked as flights
        storage_path: formatStoragePath(tripId, "passports", "jr_pass.pdf"),
        file_size_bytes: 204800,
        mime_type: "application/pdf",
      });

      const docId = createRes.document!.id;
      expect(createRes.document?.category).toBe("flights");

      const updateRes = await updateDocumentCategoryAction(docId, "passports");
      expect(updateRes.success).toBe(true);
      expect(updateRes.document?.category).toBe("passports");

      const docs = await getVaultDocumentsAction(tripId);
      const found = docs.documents.find((d) => d.id === docId);
      expect(found?.category).toBe("passports");
    });

    it("deletes a document and cleans up vault cache", async () => {
      const createRes = await createDocumentAction({
        trip_id: tripId,
        uploaded_by: userId,
        title: "Temporary Hotel Invoice",
        category: "hotels",
        storage_path: formatStoragePath(tripId, "hotels", "temp_inv.pdf"),
        file_size_bytes: 120000,
        mime_type: "application/pdf",
      });

      const docId = createRes.document!.id;
      const delRes = await deleteDocumentAction(docId);
      expect(delRes.success).toBe(true);

      const docs = await getVaultDocumentsAction(tripId);
      expect(docs.documents.find((d) => d.id === docId)).toBeUndefined();
    });
  });
});
