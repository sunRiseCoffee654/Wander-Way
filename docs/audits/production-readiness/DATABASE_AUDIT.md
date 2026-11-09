# WanderWay v3.0 — Comprehensive Production Readiness Audit
## Database Schema, PostGIS & Data Integrity Audit

**Audit Execution Date:** November 9, 2026  
**Auditor:** Database & PostgreSQL Specialist  
**Repository Target:** `d:\Projects\WanderWay`  
**Target RDBMS:** Supabase PostgreSQL 15+ with PostGIS 3.3+ (Spatial Reference EPSG:4326)

---

### 1. Database Architecture Overview

WanderWay v3.0 uses a relational PostgreSQL schema designed for multi-tenant trip collaboration, offline-capable synchronization, and spatial geography:
- **Spatial Geometry:** Stored as `geography(point, 4326)` on `itinerary_activities.coordinates`.
- **Monetary Storage:** Stored as 64-bit integer minor units (`bigint`) across `trips.budget_minor_units`, `budget_line_items.amount_minor_units`, and `bookings.amount_minor_units`.
- **Integrity Invariants:** Trip ownership cascaded across 13 tables; strict check constraints on traveler counts (`traveler_count >= 1`, `room_count >= 1`), valid budget bases (`'total'`, `'per_person'`), and state transitions.

---

### 2. Critical Database Defects & Schema Mismatches

#### 2.1 UUID Format Incompatibility (`22P02: invalid input syntax for type uuid`)
- **Tables Affected:** `public.bookings` (column `id uuid`), `public.documents` (columns `id uuid`, `uploaded_by uuid`).
- **Defect Description:**  
  The application generates non-UUID string IDs in TypeScript:
  - `src/lib/bookings/actions.ts:110`: `id: 'booking-${Date.now()}-${random}'`
  - `src/lib/vault/actions.ts:43`: `id: 'doc-${Date.now()}-${random}'`
  - `src/components/vault/stitch-vault-view.tsx:1074`: `uploaded_by: "current_user"`
- **Database Error:**  
  When PostgREST issues an `INSERT` statement containing these strings, PostgreSQL rejects the row with:
  `ERROR 22P02: invalid input syntax for type uuid: "booking-1731144000000-abcde"`
- **Root Cause & Fix:**  
  IDs must be generated using `crypto.randomUUID()`, or omitted from the insert payload so PostgreSQL defaults to `gen_random_uuid()`. `uploaded_by` must receive the authenticated user's UUID (`auth.uid()`).

---

#### 2.2 Broken Column Query Mismatches
A systematic diff between database migration definitions in `supabase/migrations/` and client queries in `src/` revealed 5 broken column queries:

| Table | Migration Column Name | Client Code Column Name | Affected Source File & Line | Runtime Error |
|---|---|---|---|---|
| `trips` | `budget_currency` | `base_currency` | `src/app/(dashboard)/trips/[tripId]/bookings/page.tsx:28` | PostgREST schema cache error (PGRST100); page returns 404 |
| `trips` | `destination` | `destination_name` | `src/app/(dashboard)/trips/[tripId]/packing/page.tsx:34` | PostgREST schema cache error (PGRST100); page returns 404 |
| `trips` | `destination` | `destination_name` | `src/app/(dashboard)/packing/page.tsx:28` | PostgREST schema cache error (PGRST100); returns fallback |
| `trips` | `destination` | `destination_name` | `src/app/api/trips/[tripId]/packing/generate/route.ts:24` | Fails to fetch destination; falls back to default string |
| `trips` | `trip_state` | `status` | `src/app/page.tsx:29` | Query fails; `dbTrips` on home page is null |
| `profiles` | `full_name` | `display_name` | `src/lib/collaboration/actions.ts:20, 57, 109, 199` | Joins fail; member roster and message names fail to load |
| `profiles` | *(none)* | `travel_pace` | `src/components/auth/profile-settings.tsx:98` | Upsert throws error; saving profile fails |

---

#### 2.3 RPC Parameter Signature Mismatch (`apply_trip_proposal`)
- **Migration `20261108100000_fix_proposal_booking_hint.sql` defines:**
  ```sql
  create or replace function public.apply_trip_proposal(
    p_proposal_id uuid,
    p_trip_id uuid,
    p_selected_activity_ids text[]
  ) returns jsonb ...
  ```
- **Caller in `src/app/api/trips/apply-proposal/route.ts:35` invokes:**
  ```ts
  const { data: result, error: rpcError } = await supabase.rpc("apply_trip_proposal", {
    p_proposal_id: proposalId,
    p_selected_activity_ids: selectedActivityIds,
  });
  ```
- **Error:** Parameter `p_trip_id` is missing. PostgreSQL fails to resolve the function overload or calls an obsolete definition, causing atomic itinerary proposal merging to fail.

---

### 3. Check Constraints & Referential Integrity Audit

Review of foreign key relationships across all tables:
1. `trips.owner_id` → `profiles(id) ON DELETE CASCADE`: **VERIFIED**
2. `trip_members.trip_id` → `trips(id) ON DELETE CASCADE`: **VERIFIED**
3. `itinerary_days.trip_id` → `trips(id) ON DELETE CASCADE`: **VERIFIED**
4. `itinerary_activities.day_id` → `itinerary_days(id) ON DELETE CASCADE`: **VERIFIED**
5. `itinerary_activities.trip_id` → `trips(id) ON DELETE CASCADE`: **VERIFIED**
6. `bookings.trip_id` → `trips(id) ON DELETE CASCADE`: **VERIFIED**
7. `documents.trip_id` → `trips(id) ON DELETE CASCADE`: **VERIFIED**
8. `documents.uploaded_by` → `profiles(id) ON DELETE RESTRICT`: **VERIFIED**

**Assessment:** The relational structure enforces strict referential integrity. Deleting a trip cleanly purges its days, activities, bookings, proposals, and documents without leaving orphaned records.

---

### 4. Migration History & Idempotency Review

The repository contains 9 sequential SQL migrations in `supabase/migrations/`:
1. `20261107_001_core_schema.sql`: Core baseline tables & PostGIS extension.
2. `20261107_002_rls_policies.sql`: Initial Row Level Security policies.
3. `20261107_003_postgis_helpers.sql`: PostGIS distance & bounding box functions.
4. `20261107_004_schema_hardening.sql`: Foreign key indexes & performance tuning.
5. `20261107_005_advisor_remediations.sql`: Advisor index fixes.
6. `20261107120000_trip_proposals.sql`: Staging tables for AI proposals.
7. `20261107120100_trip_proposal_rpcs.sql`: Initial proposal application RPCs.
8. `20261108100000_fix_proposal_booking_hint.sql`: Corrected proposal booking hint & added 3-parameter RPC.
9. `20261108140000_group_collaboration_and_chat.sql`: Group chat, messages, invitations, and activity proposals.

**Required New Migration:** A 10th migration is required (`20261109000000_harden_collaboration_rls.sql`) to tighten security on `trip_invitations` and `trip_activity_proposals`.
