# WanderWay v3.0 — Comprehensive Production Readiness Audit
## Consolidated Bug Register & Defect Inventory

**Audit Execution Date:** November 9, 2026  
**Auditor:** Independent Software Quality Assurance Team  
**Repository Target:** `d:\Projects\WanderWay`

---

### Master Defect Registry

| ID | Severity | Category | Finding | Affected Area | Reproducible | Status |
|---|:---:|---|---|---|:---:|:---:|
| **BUG-001** | **P0** | Data Integrity | PostgreSQL `22P02` UUID Syntax Error in Bookings & Document Vault | `src/lib/bookings/actions.ts`, `src/lib/vault/actions.ts`, `stitch-vault-view.tsx` | YES | **REMEDIATED & VERIFIED** |
| **BUG-002** | **P1** | Functional Defect | Broken Column Query `trips.base_currency` breaks Bookings View (404) | `src/app/(dashboard)/trips/[tripId]/bookings/page.tsx:28` | YES | **REMEDIATED & VERIFIED** |
| **BUG-003** | **P1** | Functional Defect | Broken Column Query `trips.destination_name` breaks Packing Views (404) | `src/app/(dashboard)/trips/[tripId]/packing/page.tsx:34`, `packing/page.tsx:28` | YES | **REMEDIATED & VERIFIED** |
| **BUG-004** | **P1** | Functional Defect | Broken Column Queries in Home Trips, Collaboration & Profile Settings | `src/app/page.tsx:29`, `src/lib/collaboration/actions.ts:57`, `profile-settings.tsx:98` | YES | **REMEDIATED & VERIFIED** |
| **BUG-005** | **P1** | Functional Defect | RPC Parameter Mismatch in Proposal Apply (`p_trip_id` missing) | `src/app/api/trips/apply-proposal/route.ts:35` | YES | **REMEDIATED & VERIFIED** |
| **BUG-006** | **P1** | Financial Integrity| Multi-Currency Blind Summation in Debt Settlement | `src/lib/budget/settlement.ts:46–115` | YES | **REMEDIATED & VERIFIED** |
| **BUG-007** | **P0** | Security | Unauthenticated Gemini AI Route & Unauthorized Trip Mutation | `src/app/api/trips/[tripId]/packing/generate/route.ts:9–34` | YES | **REMEDIATED & VERIFIED** |
| **BUG-008** | **P1** | UX / Navigation | Query Parameter Mismatch (`destination` vs `dest`) in Trip Wizard | `src/app/(dashboard)/trips/page.tsx:196` & `/trips/new/page.tsx:12` | YES | **REMEDIATED & VERIFIED** |
| **BUG-009** | **P1** | UX / Navigation | Active Trip Context Breakage in Persistent Sidebar Navigation | `src/app/(dashboard)/layout.tsx:36, 54` & `stitch-sidebar.tsx:22–27` | YES | **REMEDIATED & VERIFIED** |
| **BUG-010** | **P0** | Security | Open Redirect Vulnerability in OAuth Callback Route | `src/app/(auth)/callback/route.ts:14, 42` | YES | **REMEDIATED & VERIFIED** |
| **BUG-011** | **P1** | Security / RLS | Overly Broad RLS Policies on `trip_invitations` and `trip_activity_proposals` | `supabase/migrations/20261108140000_group_collaboration_and_chat.sql:73–96` | YES | **REMEDIATED (Migration 20261109000000)** |
| **BUG-012** | **P2** | Performance | Concurrency Pool in AI Plan Generation Pipeline (10–14s multi-step latency) | `src/lib/ai/grounding.ts:79–85` | NO (Verified Pool exists) | **ANALYZED & CLOSED** |
| **BUG-013** | **P2** | Reliability | Ephemeral Serverless In-Memory State Masking Database Failures | `src/lib/bookings/actions.ts:12`, `src/lib/vault/actions.ts:14` | YES | **HARDENED WITH UUID VALIDATION** |

---

### Detailed Defect Reports

#### Defect BUG-001: PostgreSQL `22P02` UUID Syntax Error in Bookings & Document Vault
- **Severity:** P0 — Critical (Silent Data Loss)
- **Category:** Data Integrity & Database Compatibility
- **Affected Files:**
  - `src/lib/bookings/actions.ts:110, 132`
  - `src/lib/vault/actions.ts:43, 62`
  - `src/components/vault/stitch-vault-view.tsx:1074`
- **Steps to Reproduce:**
  1. Open a trip and navigate to Bookings or Vault.
  2. Create a new flight booking or upload a travel voucher.
  3. Observe server action inserting `id: "booking-173..."` or `uploaded_by: "current_user"`.
  4. Inspect database response.
- **Expected Behavior:** Row is inserted into Supabase PostgreSQL tables `bookings` and `documents` with valid UUID foreign keys.
- **Actual Behavior:** PostgreSQL throws `ERROR 22P02: invalid input syntax for type uuid`. The try/catch block catches the error and stores the item only in local memory `BOOKINGS_STORE` / `VAULT_STORE`.
- **Root Cause:** Custom string IDs and placeholder user IDs fail PostgreSQL strict UUID column validation.
- **Business Impact:** User believes bookings and documents are saved; on serverless cold starts or multi-instance deployments, all records vanish permanently.
- **Remediation:** Use `crypto.randomUUID()` for all IDs and pass authenticated `user.id` for `uploaded_by`.
- **Confidence Level:** 100% Confirmed.

---

#### Defect BUG-002: Broken Column Query `trips.base_currency` breaks Bookings View (404)
- **Severity:** P1 — High (Critical Workflow Broken)
- **Category:** Functional Defect
- **Affected File:** `src/app/(dashboard)/trips/[tripId]/bookings/page.tsx:28`
- **Steps to Reproduce:**
  1. Sign in and navigate to `/trips/[tripId]/bookings`.
  2. Observe page failure.
- **Expected Behavior:** Bookings page loads with trip details and booking categories.
- **Actual Behavior:** Page triggers Next.js `notFound()` (HTTP 404).
- **Root Cause:** Query selects `.select("id, title, destination, base_currency")`. The database column in `trips` is `budget_currency`.
- **Business Impact:** Travelers cannot view or manage external bookings for any trip.
- **Remediation:** Change `base_currency` to `budget_currency`.
- **Confidence Level:** 100% Confirmed.

---

#### Defect BUG-003: Broken Column Query `trips.destination_name` breaks Packing Views (404)
- **Severity:** P1 — High (Critical Workflow Broken)
- **Category:** Functional Defect
- **Affected Files:**
  - `src/app/(dashboard)/trips/[tripId]/packing/page.tsx:34`
  - `src/app/(dashboard)/packing/page.tsx:28`
  - `src/app/api/trips/[tripId]/packing/generate/route.ts:24`
- **Steps to Reproduce:**
  1. Navigate to `/trips/[tripId]/packing` or `/packing`.
- **Expected Behavior:** Packing checklist and contextual gear view render.
- **Actual Behavior:** `/trips/[tripId]/packing` renders a 404 page; `/packing` fails to retrieve trip data.
- **Root Cause:** Column `destination_name` does not exist on `trips`; the schema column is `destination`.
- **Business Impact:** The entire Smart Packing companion is inaccessible to travelers.
- **Remediation:** Change `destination_name` to `destination`.
- **Confidence Level:** 100% Confirmed.

---

#### Defect BUG-004: Broken Column Queries in Home Trips, Collaboration & Profile Settings
- **Severity:** P1 — High
- **Category:** Functional Defect
- **Affected Files:**
  - `src/app/page.tsx:29` (`trips.status` -> `trips.trip_state`)
  - `src/lib/collaboration/actions.ts:20, 57, 109, 199` (`profiles.display_name` -> `profiles.full_name`)
  - `src/components/auth/profile-settings.tsx:98` (`travel_pace` on `profiles`)
- **Expected Behavior:** User's trips show on home page; collaboration members load display names; user profile saves successfully.
- **Actual Behavior:** PostgREST schema cache errors prevent home trips from loading, break collaboration member rosters, and crash profile saving.
- **Root Cause:** Column names in application code do not match PostgreSQL table definitions.
- **Remediation:** Update queries to use `trip_state` and `full_name`, and remove `travel_pace` from `profiles` upsert.
- **Confidence Level:** 100% Confirmed.

---

#### Defect BUG-005: RPC Parameter Mismatch in Proposal Apply (`p_trip_id` missing)
- **Severity:** P1 — High (Core Workflow Broken)
- **Category:** Functional Defect
- **Affected File:** `src/app/api/trips/apply-proposal/route.ts:35`
- **Steps to Reproduce:**
  1. Generate an AI itinerary proposal.
  2. In the proposal review modal, click "Apply Proposal".
- **Expected Behavior:** RPC applies selected activities and inserts days and activities into the database.
- **Actual Behavior:** API returns 500 error: RPC execution fails because `p_trip_id` is missing from the payload.
- **Root Cause:** Function `apply_trip_proposal` in migration `20261108100000_fix_proposal_booking_hint.sql` requires 3 parameters (`p_proposal_id`, `p_trip_id`, `p_selected_activity_ids`). The route handler only supplies 2.
- **Remediation:** Pass `p_trip_id` in the RPC invocation payload.
- **Confidence Level:** 100% Confirmed.

---

#### Defect BUG-006: Multi-Currency Blind Summation in Debt Settlement
- **Severity:** P1 — High (Financial Inaccuracy)
- **Category:** Financial Integrity & Calculations
- **Affected File:** `src/lib/budget/settlement.ts:46–115`
- **Steps to Reproduce:**
  1. Add an expense of 10,000 JPY paid by traveler A.
  2. Add an expense of 100 USD paid by traveler B.
  3. Calculate net balances.
- **Expected Behavior:** Expenses are normalized to a common base currency using recorded exchange rates before balances are aggregated.
- **Actual Behavior:** 10,000 JPY is directly added to 100 USD, treating 1 JPY as equal to 1 USD, causing catastrophic financial distortion.
- **Root Cause:** `calculateNetBalances` lacks currency conversion logic and accepts unnormalized amounts.
- **Remediation:** Accept a `targetCurrency` and exchange rates map, or reject mixed currencies with an explicit error.
- **Confidence Level:** 100% Confirmed.

---

#### Defect BUG-007: Unauthenticated Gemini AI Route & Unauthorized Trip Mutation
- **Severity:** P0 — Critical (Security & Cost Vulnerability)
- **Category:** Security & Access Control
- **Affected File:** `src/app/api/trips/[tripId]/packing/generate/route.ts:9–34`
- **Steps to Reproduce:**
  1. Send an unauthenticated HTTP POST to `/api/trips/[tripId]/packing/generate`.
- **Expected Behavior:** Server returns HTTP 401 Unauthorized.
- **Actual Behavior:** Server invokes Google Gemini API and inserts packing items into the database.
- **Root Cause:** No authentication check or trip membership authorization.
- **Remediation:** Require `supabase.auth.getUser()` and verify caller is a member of `tripId`.
- **Confidence Level:** 100% Confirmed.

---

#### Defect BUG-008: Query Parameter Mismatch (`destination` vs `dest`) in Trip Wizard
- **Severity:** P1 — High (UX Friction)
- **Category:** UI/UX & Routing
- **Affected Files:**
  - `src/app/(dashboard)/trips/page.tsx:196`
  - `src/app/(dashboard)/trips/new/page.tsx:12, 29`
- **Steps to Reproduce:**
  1. Navigate to `/trips`.
  2. Click "Start planning" on any popular destination card (e.g. Tokyo, Japan).
- **Expected Behavior:** Trip Wizard opens with "Tokyo, Japan" prefilled in the destination input.
- **Actual Behavior:** Wizard destination input is empty.
- **Root Cause:** Card uses `?destination=...`; page reads `searchParams.dest`.
- **Remediation:** Change `destination` to `dest` in `trips/page.tsx:196`.
- **Confidence Level:** 100% Confirmed.

---

#### Defect BUG-009: Active Trip Context Breakage in Persistent Sidebar Navigation
- **Severity:** P1 — High (UX Disorientation)
- **Category:** Navigation & State Management
- **Affected Files:**
  - `src/app/(dashboard)/layout.tsx:36, 54`
  - `src/components/layout/stitch-sidebar.tsx:22–27`
- **Steps to Reproduce:**
  1. User has two trips (Trip 1 and Trip 2).
  2. User opens Trip 1 (`/trips/trip-1-id`).
  3. User clicks "Bookings & Passes" or "Budget Intelligence" in the sidebar.
- **Expected Behavior:** Navigates to `/trips/trip-1-id/bookings`.
- **Actual Behavior:** Navigates to `/trips/trip-2-id/bookings` (the most recently created trip).
- **Root Cause:** Sidebar generates links using `activeTripId` passed from layout, which queries `order("created_at").limit(1)` instead of inspecting the current URL path.
- **Remediation:** In `stitch-sidebar.tsx`, dynamically extract the trip ID from `usePathname()`.
- **Confidence Level:** 100% Confirmed.

---

#### Defect BUG-010: Open Redirect Vulnerability in OAuth Callback Route
- **Severity:** P0 — Critical (Account Security)
- **Category:** Security
- **Affected File:** `src/app/(auth)/callback/route.ts:14, 42`
- **Steps to Reproduce:**
  1. Visit `/callback?code=...&next=//attacker.com`.
- **Expected Behavior:** Redirect rejected; defaults safely to `/trips`.
- **Actual Behavior:** User is redirected to `//attacker.com`.
- **Root Cause:** Unsanitized string interpolation into `NextResponse.redirect`.
- **Remediation:** Validate that `next` begins with `/` and does not contain `//`, `\\`, or `@`.
- **Confidence Level:** 100% Confirmed.

---

#### Defect BUG-011: Overly Broad RLS Policies on `trip_invitations` and `trip_activity_proposals`
- **Severity:** P1 — High (Data Privacy & Privilege Escalation)
- **Category:** Database Security & RLS
- **Affected File:** `supabase/migrations/20261108140000_group_collaboration_and_chat.sql:73–96, 126–130`
- **Steps to Reproduce:**
  1. Log in as an unrelated user.
  2. Query `SELECT * FROM public.trip_invitations WHERE status = 'pending'`.
- **Expected Behavior:** Query returns empty array (default deny).
- **Actual Behavior:** Returns all pending invitations in the entire database.
- **Root Cause:** RLS policy includes `or (status = 'pending' and expires_at > now())`.
- **Remediation:** Remove public pending visibility and restrict to members, inviter, or matching invitee email.
- **Confidence Level:** 100% Confirmed.
