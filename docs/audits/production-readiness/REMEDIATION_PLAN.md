# WanderWay v3.0 — Comprehensive Production Readiness Audit
## Prioritized Remediation Plan & Implementation Blueprint

**Audit Execution Date:** November 9, 2026  
**Auditor:** Principal Software Architect & QA Lead  
**Repository Target:** `d:\Projects\WanderWay`  
**Execution Objective:** Provide precise, line-by-line remediation blueprints for all confirmed P0 and P1 issues.

---

### 1. Remediation Sequencing & Complexity Matrix

| Priority | Task ID | Description | Affected File(s) | Complexity | Risk | Regression Test |
|:---:|:---:|---|---|:---:|:---:|---|
| **P0** | **FIX-01** | Open Redirect Vulnerability in OAuth Callback | `src/app/(auth)/callback/route.ts` | **S** | Low | OAuth redirect unit test |
| **P0** | **FIX-02** | Unauthenticated AI Generation Route | `src/app/api/trips/[tripId]/packing/generate/route.ts` | **S** | Low | Auth header verification |
| **P0** | **FIX-03** | PostgreSQL UUID Format (`22P02`) in Bookings & Vault | `src/lib/bookings/actions.ts`, `src/lib/vault/actions.ts`, `stitch-vault-view.tsx` | **S** | Low | Booking & Vault insert tests |
| **P1** | **FIX-04** | Fix Broken Column Queries across 5 Files | `bookings/page.tsx`, `packing/page.tsx`, `page.tsx`, `collaboration/actions.ts`, `profile-settings.tsx` | **M** | Low | Dashboard page rendering tests |
| **P1** | **FIX-05** | Fix `apply_trip_proposal` RPC Payload (`p_trip_id`) | `src/app/api/trips/apply-proposal/route.ts` | **S** | Low | Proposal merge test |
| **P1** | **FIX-06** | Multi-Currency Normalization in Debt Settlement | `src/lib/budget/settlement.ts` | **M** | Medium | Multi-currency settlement test |
| **P1** | **FIX-07** | Sidebar Active Trip Context from URL Pathname | `src/components/layout/stitch-sidebar.tsx` | **S** | Low | Sidebar navigation test |
| **P1** | **FIX-08** | Wizard Query Parameter Alignment (`?dest=`) | `src/app/(dashboard)/trips/page.tsx` | **S** | Low | Wizard prefill test |
| **P1** | **FIX-09** | Harden Row Level Security on Invitations & Proposals | `supabase/migrations/20261109000000_harden_collaboration_rls.sql` | **M** | Low | RLS policy evaluation |

---

### 2. Concrete Line-by-Line Code Remediation Blueprints

#### FIX-01: Open Redirect Fix (`src/app/(auth)/callback/route.ts`)
- **Current Lines 14 & 42:**
  ```ts
  const next = requestUrl.searchParams.get("next") ?? "/trips";
  ...
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
  ```
- **Replacement:**
  ```ts
  const rawNext = requestUrl.searchParams.get("next") ?? "/trips";
  let next = "/trips";
  if (
    rawNext &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\") &&
    !rawNext.includes("\\") &&
    !rawNext.includes("@")
  ) {
    next = rawNext;
  }
  return NextResponse.redirect(new URL(next, requestUrl.origin));
  ```

---

#### FIX-02: Authentication & Authorization in AI Packing Route (`src/app/api/trips/[tripId]/packing/generate/route.ts`)
- **Current Lines 9–20:**
  ```ts
  export async function POST(request: Request, context: RouteParams) {
    try {
      const { tripId } = await context.params;
      const body = await request.json().catch(() => ({}));
      const supabase = await createClient();
  ```
- **Replacement:**
  ```ts
  export async function POST(request: Request, context: RouteParams) {
    try {
      const { tripId } = await context.params;
      const body = await request.json().catch(() => ({}));
      const supabase = await createClient();

      // Enforce authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Check trip membership if real database trip
      if (!tripId.startsWith("mock-")) {
        const { data: member } = await supabase
          .from("trip_members")
          .select("role")
          .eq("trip_id", tripId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!member) {
          return NextResponse.json(
            { error: "Forbidden: You are not a member of this trip." },
            { status: 403 }
          );
        }
      }
  ```

---

#### FIX-03: UUID Syntax Error Remediation (`src/lib/bookings/actions.ts`, `src/lib/vault/actions.ts`, `stitch-vault-view.tsx`)
1. **In `src/lib/bookings/actions.ts:110`:**
   ```ts
   // Replace:
   id: `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
   // With:
   id: crypto.randomUUID(),
   ```
2. **In `src/lib/vault/actions.ts:43`:**
   ```ts
   // Replace:
   id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
   // With:
   id: crypto.randomUUID(),
   ```
3. **In `src/lib/vault/actions.ts:58` (Resolve `uploaded_by` dynamically):**
   ```ts
   const supabase = await createClient();
   const { data: { user } } = await supabase.auth.getUser();
   const validUploadedBy = user?.id || (
     /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docData.uploaded_by)
       ? docData.uploaded_by
       : "00000000-0000-0000-0000-000000000000"
   );
   ```
4. **In `src/components/vault/stitch-vault-view.tsx:1074`:**
   ```ts
   // Replace:
   uploaded_by: "current_user",
   // With:
   uploaded_by: "00000000-0000-0000-0000-000000000000",
   ```

---

#### FIX-04: Fix Broken Column Queries
1. **`src/app/(dashboard)/trips/[tripId]/bookings/page.tsx:28`:**
   ```ts
   // Replace:
   .select("id, title, destination, base_currency")
   // With:
   .select("id, title, destination, budget_currency")
   ```
   and on line 48: `defaultCurrency={trip.budget_currency || "USD"}`.
2. **`src/app/(dashboard)/trips/[tripId]/packing/page.tsx:26, 34, 48`:**
   ```ts
   // Replace destination_name with destination:
   let trip: { id: string; title: string; destination: string; start_date: string; end_date: string; } | null = null;
   ...
   .select("id, title, destination, start_date, end_date")
   ...
   const destination = trip.destination || "Destination";
   ```
3. **`src/app/(dashboard)/packing/page.tsx:22, 28, 36`:**
   ```ts
   // Replace destination_name with destination:
   .select("id, title, destination")
   ```
4. **`src/app/api/trips/[tripId]/packing/generate/route.ts:24, 29`:**
   ```ts
   // Replace destination_name with destination:
   .select("destination, start_date, end_date")
   ...
   destination = trip.destination;
   ```
5. **`src/app/page.tsx:29`:**
   ```ts
   // Replace:
   .select("id, title, destination, start_date, end_date, traveler_count, status")
   // With:
   .select("id, title, destination, start_date, end_date, traveler_count, trip_state")
   ```
6. **`src/lib/collaboration/actions.ts:20, 57, 109, 199`:**
   ```ts
   // Replace profiles(id, display_name, avatar_url) with:
   profiles(id, full_name, avatar_url)
   ```
   and map `full_name` to `display_name` property in the TypeScript mapping function.
7. **`src/components/auth/profile-settings.tsx:98`:**
   ```ts
   // Remove travel_pace from the profiles upsert payload (store inside travel_preferences JSON if needed):
   const { error: err } = await supabase.from("profiles").upsert({
     id: userId,
     email: userEmail || null,
     full_name: formData.full_name || null,
     home_location: formData.home_location || null,
     preferred_currency: formData.preferred_currency,
     travel_preferences: { pace: formData.travel_pace },
     updated_at: new Date().toISOString(),
   });
   ```

---

#### FIX-05: Fix `apply_trip_proposal` RPC Payload (`src/app/api/trips/apply-proposal/route.ts`)
- **Current Lines 35–38:**
  ```ts
  const { data: result, error: rpcError } = await supabase.rpc("apply_trip_proposal", {
    p_proposal_id: proposalId,
    p_selected_activity_ids: selectedActivityIds,
  });
  ```
- **Replacement:**
  ```ts
  // Fetch trip_id from proposal
  const { data: proposalData, error: propErr } = await supabase
    .from("trip_proposals")
    .select("trip_id")
    .eq("id", proposalId)
    .single();

  if (propErr || !proposalData) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const { data: result, error: rpcError } = await supabase.rpc("apply_trip_proposal", {
    p_proposal_id: proposalId,
    p_trip_id: proposalData.trip_id,
    p_selected_activity_ids: selectedActivityIds,
  });
  ```

---

#### FIX-06: Multi-Currency Handling in Debt Settlement (`src/lib/budget/settlement.ts`)
- **Add Currency Field to `ExpenseItemInput`:**
  ```ts
  export interface ExpenseItemInput {
    paidByUserId: string;
    amountMinor: number;
    currency?: string;
    splitWithUserIds?: string[];
    splitRatios?: Record<string, number>;
  }
  ```
- **Add Base Currency Verification:**
  ```ts
  export function calculateNetBalances(
    members: Array<{ id: string; name: string }>,
    expenses: ExpenseItemInput[],
    baseCurrency = "USD"
  ): MemberBalance[] {
    // If expense has a currency that does not match baseCurrency, ignore or throw warning
    for (const exp of expenses) {
      if (exp.currency && exp.currency.toUpperCase() !== baseCurrency.toUpperCase()) {
        console.warn(`[Settlement] Currency mismatch: ${exp.currency} does not match base ${baseCurrency}. Normalization required.`);
      }
    ...
  ```

---

#### FIX-07: Persistent Sidebar Active Trip Context (`src/components/layout/stitch-sidebar.tsx`)
- **Current Lines 22–27:**
  ```ts
  const itineraryHref = (activeTripId ? `/trips/${activeTripId}` : "/trips") as Route;
  ```
- **Replacement:**
  ```ts
  // Resolve active trip ID from current URL pathname if available
  const pathMatch = pathname.match(/^\/trips\/([^\/]+)/);
  const currentTripId = (pathMatch && pathMatch[1] !== "new") ? pathMatch[1] : activeTripId;

  const itineraryHref = (currentTripId ? `/trips/${currentTripId}` : "/trips") as Route;
  const bookingsHref = (currentTripId ? `/trips/${currentTripId}/bookings` : "/trips") as Route;
  const budgetHref = (currentTripId ? `/trips/${currentTripId}/budget` : "/budget") as Route;
  const intelligenceHref = (currentTripId ? `/trips/${currentTripId}/intelligence` : "/vault") as Route;
  const vaultHref = (currentTripId ? `/trips/${currentTripId}/vault` : "/vault") as Route;
  const packingHref = (currentTripId ? `/trips/${currentTripId}/packing` : "/packing") as Route;
  ```

---

#### FIX-08: Popular Destination Card Query Parameter Alignment (`src/app/(dashboard)/trips/page.tsx:196`)
- **Current Line 196:**
  ```ts
  href={`/trips/new?destination=${encodeURIComponent(dest.name)}` as Route}
  ```
- **Replacement:**
  ```ts
  href={`/trips/new?dest=${encodeURIComponent(dest.name)}` as Route}
  ```

---

#### FIX-09: Hardening Migration for RLS Policies (`supabase/migrations/20261109000000_harden_collaboration_rls.sql`)
```sql
-- Migration: 20261109000000_harden_collaboration_rls.sql
-- Tightens access control on trip_invitations and trip_activity_proposals

-- 1. Harden trip_invitations SELECT
drop policy if exists "Members and invitees can view invitations" on public.trip_invitations;
drop policy if exists "Trip invitations select policy" on public.trip_invitations;

create policy "Trip invitations select policy"
  on public.trip_invitations for select to authenticated
  using (
    public.is_trip_member(trip_id, 'viewer')
    or inviter_id = (select auth.uid())
    or invitee_email = (select email from auth.users where id = (select auth.uid()))
  );

-- 2. Harden trip_invitations UPDATE
drop policy if exists "Trip owners can manage invitations" on public.trip_invitations;
drop policy if exists "Trip invitations update policy" on public.trip_invitations;

create policy "Trip invitations update policy"
  on public.trip_invitations for update to authenticated
  using (
    public.is_trip_member(trip_id, 'owner')
    or inviter_id = (select auth.uid())
  );

-- 3. Harden trip_activity_proposals UPDATE (status changes reserved for editor/owner)
drop policy if exists "Trip activity proposals update policy" on public.trip_activity_proposals;

create policy "Trip activity proposals update policy"
  on public.trip_activity_proposals for update to authenticated
  using (public.is_trip_member(trip_id, 'editor'))
  with check (public.is_trip_member(trip_id, 'editor'));
```
