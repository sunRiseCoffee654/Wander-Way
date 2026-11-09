# WanderWay v3.0 — Comprehensive Production Readiness Audit
## Functional Test Report & User Journey Verification Matrix

**Audit Execution Date:** November 9, 2026  
**Auditor:** Independent QA & Testing Architecture Team  
**Repository Target:** `d:\Projects\WanderWay`  
**Execution Harness:** Vitest 5.1.0 (301 passing tests), Next.js 16.4.5 Turbopack Build, Static Code Trace

---

### 1. Functional Scope & Feature Inventory

The WanderWay v3.0 platform was evaluated across 10 end-to-end user workflows:

1. **Home Launcher & Trip Date Planning:** Date range selection, duration quick-chips, query param compilation.
2. **Explore Hub & Destination Intelligence:** Showcase destinations, live consular advisory ribbons, details modals.
3. **Trip Planning Wizard (`/trips/new`):** Parameter prefilling, multi-step configuration, currency selection.
4. **AI Grounded Plan Generation (`/api/trips/generate`):** Multi-day itinerary generation, Geoapify validation, proposal creation.
5. **Proposal Review & Selective Merge (`/trips/[tripId]/review/[proposalId]`):** Staged candidate review, selective activity inclusion, atomic apply RPC.
6. **Interactive Itinerary & Vector Map View (`/trips/[tripId]/itinerary` & `/map`):** 60/40 split view, MapLibre GL tiles, pin sync, activity add/edit/reorder/delete.
7. **Budget Intelligence & Debt Settlement (`/trips/[tripId]/budget`):** Minor-unit calculations, currency switching, expense logging, greedy debt settlement.
8. **Bookings & Reservations Tracker (`/trips/[tripId]/bookings`):** Flight/hotel/train passes, status funnels, modal CRUD.
9. **Smart Packing & Contextual Gear (`/trips/[tripId]/packing` & `/packing`):** Contextual AI gear generation, category filters, pack toggles.
10. **Live Travel Intelligence & Vault (`/trips/[tripId]/vault` & `/intelligence`):** Flight status, consular alerts, weather radar, encrypted document uploads.

---

### 2. Functional Test Verification Matrix

| Workflow / Feature | Test Scenario | Expected Result | Actual Result | Status | Defect ID |
|---|---|---|---|:---:|:---:|
| **Home Launcher** | Date range picker with quick chips | Updates start/end dates and serializes to `/trips/new?dest=...` | Successfully compiles URL with `dest`, `startDate`, `endDate`, `party`, `budget` | **PASS** | — |
| **Home Screen DB Trips** | Authenticated user visits `/` with existing trips | Displays user's recent trips in the launcher section | Fails to fetch trips due to `.select(..., status)` query error; `dbTrips` is null | **FAIL** | BUG-004 |
| **Trip Wizard Prefill** | Click popular destination on `/trips` (e.g. Tokyo) | Navigates to wizard with destination input pre-populated | Opens `/trips/new?destination=Tokyo`; wizard expects `?dest=`, input remains blank | **FAIL** | BUG-008 |
| **AI Plan Generation** | Generate 3-day itinerary for Kyoto | Returns staged proposal with verified place coordinates | Gemini generates schedule; Geoapify grounds activities within 50 km | **PASS** | — |
| **Proposal Apply RPC** | User clicks "Apply Proposal to Itinerary" | Executes `apply_trip_proposal` RPC and merges activities into live trip | Fails with RPC signature error: `p_trip_id` missing from route handler payload | **FAIL** | BUG-005 |
| **Itinerary Map Sync** | Click activity in schedule | Map pans and centers on corresponding marker | MapLibre camera smoothly animates to activity coordinates with active pin highlight | **PASS** | — |
| **Activity Lifecycle** | Add/edit/delete activities via modal | Updates `itinerary_activities` in DB, preserves `is_user_edited = true` | Functions as expected; unit tests verify ordering and user edit protection | **PASS** | — |
| **Bookings Tracker View** | User navigates to `/trips/[tripId]/bookings` | Loads bookings and displays status funnels | Throws 404/PGRST error: queries `base_currency` which does not exist in `trips` table | **FAIL** | BUG-002 |
| **Bookings Creation** | User creates booking via modal | Inserts booking into `bookings` table with UUID primary key | Generates string ID `booking-173...`, throwing PostgreSQL `22P02` UUID error; silently stored only in memory | **FAIL** | BUG-001 |
| **Smart Packing View** | User navigates to `/trips/[tripId]/packing` | Loads trip destination and packing checklist | Throws 404: queries `destination_name` which does not exist in `trips` table | **FAIL** | BUG-003 |
| **Global Packing View** | User navigates to `/packing` | Loads user's latest trip and checklist | Throws PGRST error: queries `destination_name` instead of `destination` | **FAIL** | BUG-003 |
| **Packing AI Generation** | POST to `/api/trips/[tripId]/packing/generate` | Generates packing items based on weather & destination | Generates items, but endpoint is unauthenticated and queries `destination_name` | **FAIL** | BUG-007 |
| **Budget Calculations** | Format minor units and compute category totals | Preserves integer cents without floating point drift | `formatMinorUnits` and `calculateBudgetSummary` work deterministically | **PASS** | — |
| **Debt Settlement** | Settle debts with mixed currencies (e.g. JPY & USD) | Normalizes currencies or rejects mismatched expense currencies | Blindly sums amounts without currency conversion, corrupting balances | **FAIL** | BUG-006 |
| **Document Vault Upload** | Upload flight voucher via vault modal | Inserts document record with authenticated user ID | Passes `uploaded_by: "current_user"`, throwing PostgreSQL `22P02` UUID error; silently stored only in memory | **FAIL** | BUG-001 |
| **Profile Settings** | User updates pace and full name | Saves preferences to `profiles` table | Throws error: `travel_pace` column does not exist on `profiles` | **FAIL** | BUG-004 |
| **Sidebar Navigation** | User views trip B and clicks "Bookings" in sidebar | Navigates to `/trips/[tripB]/bookings` | Navigates to `/trips/[tripA]/bookings` because `activeTripId` is fixed to latest trip | **FAIL** | BUG-009 |
| **Group Chat & Roster** | View trip members in collaborative drawer | Displays member roster with avatars | Throws PostgREST error: queries `display_name` on `profiles` instead of `full_name` | **FAIL** | BUG-004 |

---

### 3. Deep Analysis of Functional Failures

#### 3.1 Silent Database Insertion Failure (UUID Syntax Error `22P02`)
- **Affected Functions:** `createBookingAction` (`src/lib/bookings/actions.ts:110, 132`) and `createDocumentAction` (`src/lib/vault/actions.ts:43, 62`).
- **Mechanism:** PostgreSQL schema `20261107_001_core_schema.sql` defines:
  ```sql
  create table public.bookings ( id uuid not null default gen_random_uuid(), ... );
  create table public.documents ( id uuid not null default gen_random_uuid(), uploaded_by uuid not null references public.profiles(id), ... );
  ```
- **Observed Behavior:** The server actions assign random string IDs:
  ```ts
  id: `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  ```
  and `stitch-vault-view.tsx:1074` passes `uploaded_by: "current_user"`.
- **Database Response:** Supabase returns error `22P02 (invalid input syntax for type uuid)`.
- **Impact:** Server actions catch the error and fall back to module-scoped `Map` stores. The UI displays a success toast, but data is completely lost when the serverless container restarts.

#### 3.2 Broken Column Schema Queries
- **Affected Pages:** `/trips/[tripId]/bookings`, `/trips/[tripId]/packing`, `/packing`, `/`, `/profile`, `/trips/[tripId]`.
- **Root Cause:** Next.js Server Components construct direct PostgREST queries with misspelled or outdated column names:
  1. `base_currency` instead of `budget_currency` (`trips` table)
  2. `destination_name` instead of `destination` (`trips` table)
  3. `status` instead of `trip_state` (`trips` table)
  4. `display_name` instead of `full_name` (`profiles` table)
  5. `travel_pace` upserted to `profiles` (column only exists on `trips`)
- **Impact:** Every page querying these non-existent columns fails at runtime, triggering Next.js `notFound()` 404 screens or returning empty datasets.

---

### 4. Summary of Functional Readiness

While individual algorithmic components demonstrate 100% test pass rates in mock environments, end-to-end database connectivity for Bookings, Vault, Packing, and Collaboration is **non-functional** in production until the schema column mismatches and UUID formatting are resolved.
