# WanderWay v3.0: Phases 6, 7 & 8 Implementation Plan & Final Verification

**Goal:** Deliver complete functional implementations of Phase 6 (Itinerary & Map Editor), Phase 7 (Budget Intelligence, Expense Recording & Debt Settlements), Phase 8 (Bookings Tracker, Live Intelligence & Document Vault), followed by full-scale production scan and bug remediation.

**Architecture:** Next.js 16 App Router + React 19 + TypeScript (strict) + Tailwind CSS + Supabase (PostgreSQL with PostGIS & RLS) + Google Gemini API (`@google/genai`) + Geoapify. All financial amounts strictly stored and calculated as minor integer units (`*_minor_units`). User edits outrank AI generations and persist deterministically.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Lucide React, MapLibre GL, Vitest, Supabase.

---

## Global Constraints

- [x] Never invent fake GPS coordinates or live prices; all coordinates must be grounded or marked unverified.
- [x] All currency calculations must use integer minor units and deterministic conversion rates without floating-point drift.
- [x] User edits (`is_user_edited = true`) must outrank generated drafts and never be silently overwritten by re-generation.
- [x] Zero TypeScript diagnostics (`tsc --noEmit`), zero ESLint warnings (`eslint .`), and 100% passing Vitest test suites (`npm test`).
- [x] Keep diffs scoped, atomic, and minimal (ponytail mode: solve the whole problem with the least new code).

---

## Task 1: Interactive Itinerary & Map View (Phase 6) — [x] COMPLETE

**Files:**
- Created: `src/app/(dashboard)/trips/[tripId]/itinerary/page.tsx`
- Created: `src/app/(dashboard)/trips/[tripId]/map/page.tsx`
- Created: `src/app/(dashboard)/trips/[tripId]/map/_components/trip-map-client-view.tsx`
- Created: `src/components/itinerary/activity-edit-modal.tsx`
- Created: `src/lib/itinerary/actions.ts`
- Created: `src/lib/itinerary/store.ts`
- Modified: `src/app/(dashboard)/trips/[tripId]/_components/itinerary-client-view.tsx`
- Test: `tests/unit/itinerary/activity-lifecycle.test.ts`
- Test: `tests/unit/itinerary/actions.challenge.test.ts`
- Test: `tests/unit/challenger_p6_empirical.test.ts`

- [x] **Step 1: Write failing test in `tests/unit/itinerary/activity-lifecycle.test.ts`**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement activity management helpers and server actions in `src/lib/itinerary/actions.ts`**
- [x] **Step 4: Create `ActivityEditModal` in `src/components/itinerary/activity-edit-modal.tsx` and integrate add/edit/delete/reorder in `ItineraryClientView`**
- [x] **Step 5: Create `/trips/[tripId]/itinerary/page.tsx` and fullscreen map view in `/trips/[tripId]/map/page.tsx`**
- [x] **Step 6: Run tests and verify PASS (All tests passing)**

---

## Task 2: Budget Intelligence, Expense Recording & Debt Settlement (Phase 7) — [x] COMPLETE

**Files:**
- Created: `src/lib/budget/settlement.ts`
- Created: `src/lib/budget/actions.ts`
- Created: `src/components/budget/expense-modal.tsx`
- Created: `src/components/budget/debt-settlement-card.tsx`
- Modified: `src/components/budget/stitch-budget-view.tsx`
- Test: `tests/unit/budget/settlement.test.ts`
- Test: `tests/unit/budget/calculations.test.ts`

- [x] **Step 1: Write failing test in `tests/unit/budget/settlement.test.ts`**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement settlement algorithm in `src/lib/budget/settlement.ts` and expense actions in `src/lib/budget/actions.ts`**
- [x] **Step 4: Create `ExpenseModal` and `DebtSettlementCard` in `src/components/budget/` and connect to `StitchBudgetView`**
- [x] **Step 5: Run tests and verify PASS (All tests passing)**

---

## Task 3: External Bookings Tracker (Phase 8A) — [x] COMPLETE

**Files:**
- Created: `src/lib/bookings/types.ts`
- Created: `src/lib/bookings/actions.ts`
- Created: `src/lib/bookings/helpers.ts`
- Created: `src/components/bookings/booking-modal.tsx`
- Created: `src/components/bookings/bookings-client-view.tsx`
- Created: `src/app/(dashboard)/trips/[tripId]/bookings/page.tsx`
- Modified: `src/components/layout/stitch-sidebar.tsx`
- Test: `tests/unit/bookings/bookings-service.test.ts`

- [x] **Step 1: Write failing test in `tests/unit/bookings/bookings-service.test.ts`**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement booking actions in `src/lib/bookings/actions.ts`**
- [x] **Step 4: Create `BookingModal` and `BookingsClientView` with status/category filters**
- [x] **Step 5: Create `/trips/[tripId]/bookings/page.tsx` and wire into sidebar navigation**
- [x] **Step 6: Run tests and verify PASS (All tests passing)**

---

## Task 4: Live Travel Intelligence & Document Vault Complete (Phase 8B) — [x] COMPLETE

**Files:**
- Created: `src/app/(dashboard)/trips/[tripId]/intelligence/page.tsx`
- Created: `src/components/intelligence/intelligence-client-view.tsx`
- Created: `src/lib/vault/actions.ts`
- Created: `src/lib/vault/helpers.ts`
- Modified: `src/components/vault/stitch-vault-view.tsx`
- Modified: `src/components/layout/stitch-sidebar.tsx`
- Test: `tests/unit/intelligence/intelligence-view.test.ts`
- Test: `tests/unit/vault/vault-actions.test.ts`

- [x] **Step 1: Write failing tests in `tests/unit/intelligence/intelligence-view.test.ts` and `tests/unit/vault/vault-actions.test.ts`**
- [x] **Step 2: Run tests to verify they fail**
- [x] **Step 3: Implement vault document actions in `src/lib/vault/actions.ts`**
- [x] **Step 4: Create `IntelligenceClientView` and `/trips/[tripId]/intelligence/page.tsx` with weather, consular, aviation feeds**
- [x] **Step 5: Connect upload/download/QR preview in `StitchVaultView` and update sidebar navigation**
- [x] **Step 6: Run tests and verify PASS (All tests passing)**

---

## Task 5: Full-Scale Production Scan, Bug Remediation & Final Verification — [x] COMPLETE

- [x] **Step 1: Run comprehensive Vitest suite: `npm test` (27 test files, 301 tests passed, 0 failed)**
- [x] **Step 2: Run strict TypeScript check: `npm run typecheck` (0 errors, 0 diagnostics)**
- [x] **Step 3: Run ESLint linting: `npm run lint` (0 errors, 0 warnings)**
- [x] **Step 4: Run production build: `npm run build` (Turbopack production build succeeded)**
- [x] **Step 5: Remediate Next.js Server Action boundary violations and React 19 effect render dependencies**
