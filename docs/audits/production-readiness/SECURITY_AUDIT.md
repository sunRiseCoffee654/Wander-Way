# WanderWay v3.0 — Comprehensive Production Readiness Audit
## Application Security & Authorization Audit

**Audit Execution Date:** November 9, 2026  
**Auditor:** Senior Application Security Engineer & Penetration Tester  
**Repository Target:** `d:\Projects\WanderWay`  
**Standards Applied:** OWASP Top 10 (2021), OWASP ASVS v4.0, Supabase RLS Hardening Best Practices

---

### 1. Security Architecture & Threat Surface

WanderWay handles sensitive user data, including travel plans, flight confirmation codes, passport details in the Document Vault, and collaborative group discussions. The threat surface encompasses:

1. **Authentication Flow:** Supabase SSR cookie exchange via `/callback` route.
2. **Authorization & Multi-Tenancy:** PostgreSQL Row Level Security (RLS) across 13 tables.
3. **API Endpoints:** Next.js Route Handlers (`/api/*`) and Server Actions.
4. **Third-Party Integrations:** Google Gemini API and Geoapify API credentials.
5. **Client-Side Storage:** Browser cookies, LocalStorage, and IndexedDB cache.

---

### 2. High-Severity Security Findings

#### 2.1 [P0 — HIGH] Open Redirect Vulnerability in OAuth Callback
- **File:** `src/app/(auth)/callback/route.ts:14, 42`
- **Vulnerability Type:** CWE-601: URL Redirection to Untrusted Site ('Open Redirect')
- **Vulnerable Code:**
  ```ts
  const next = requestUrl.searchParams.get("next") ?? "/trips";
  ...
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
  ```
- **Attack Vector:** An attacker crafts an authentication link such as:
  `https://wanderway.app/callback?code=VALID_CODE&next=//attacker.com`
  or
  `https://wanderway.app/callback?code=VALID_CODE&next=\\attacker.com`
  or
  `https://wanderway.app/callback?code=VALID_CODE&next=@attacker.com`
  In modern browsers and URL specifications, `http://origin//attacker.com` or `http://origin\attacker.com` can be treated as a protocol-relative external redirect, directing the authenticated user to a phishing domain immediately after sign-in.
- **Remediation:** Strictly validate `next` to ensure it starts with a single `/` and does not contain `//`, `\\`, or `@`:
  ```ts
  let safeNext = "/trips";
  if (
    next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\") &&
    !next.includes("\\") &&
    !next.includes("@")
  ) {
    safeNext = next;
  }
  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
  ```

---

#### 2.2 [P0 — HIGH] Unauthenticated & Unchecked AI Generation Route
- **File:** `src/app/api/trips/[tripId]/packing/generate/route.ts:9–34`
- **Vulnerability Type:** CWE-306: Missing Authentication for Critical Function
- **Vulnerable Code:**
  ```ts
  export async function POST(request: Request, context: RouteParams) {
    const { tripId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const supabase = await createClient();
    // Missing: supabase.auth.getUser() check
    // Missing: RLS or ownership check verifying caller belongs to tripId
    const result = await generatePackingRecommendations(...);
    await supabase.from("packing_items").insert(itemsToInsert);
  ```
- **Attack Vector:** Any unauthenticated caller can send POST requests to `/api/trips/[any-uuid]/packing/generate`. This triggers expensive Google Gemini API calls (consuming project API quotas and billing) and inserts AI-generated packing items into other users' trip checklists.
- **Remediation:** Authenticate the session and verify that the user is an owner or editor of the trip before triggering generation:
  ```ts
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership && !tripId.startsWith("mock-")) {
    return NextResponse.json({ error: "Forbidden: Not a trip member" }, { status: 403 });
  }
  ```

---

#### 2.3 [P1 — MEDIUM] Overly Permissive Row Level Security on Trip Invitations
- **File:** `supabase/migrations/20261108140000_group_collaboration_and_chat.sql:73–96`
- **Vulnerability Type:** CWE-284: Improper Access Control
- **Vulnerable Code:**
  ```sql
  create policy "Members and invitees can view invitations"
    on public.trip_invitations for select to authenticated
    using (
      public.is_trip_member(trip_id, 'viewer')
      or (status = 'pending' and expires_at > now())
    );

  create policy "Trip owners can manage invitations"
    on public.trip_invitations for update to authenticated
    using (
      public.is_trip_member(trip_id, 'owner')
      or inviter_id = (select auth.uid())
      or status = 'pending'
    );
  ```
- **Attack Vector:** Because the SELECT policy permits `or (status = 'pending' and expires_at > now())`, any authenticated user in the database can query `SELECT * FROM public.trip_invitations` and harvest all pending invitations, exposing invitee emails, invite codes, and associated trip IDs across the entire platform. Furthermore, the UPDATE policy permits any user to mutate pending invitations because of `or status = 'pending'`.
- **Remediation:** Restrict SELECT to trip members, the inviter, or the user matching `invitee_email`. Restrict UPDATE strictly to trip owners, the inviter, or an RPC accepting the specific invitation code:
  ```sql
  drop policy if exists "Members and invitees can view invitations" on public.trip_invitations;
  create policy "Trip invitations select policy"
    on public.trip_invitations for select to authenticated
    using (
      public.is_trip_member(trip_id, 'viewer')
      or inviter_id = (select auth.uid())
      or invitee_email = (select email from auth.users where id = (select auth.uid()))
    );

  drop policy if exists "Trip owners can manage invitations" on public.trip_invitations;
  create policy "Trip invitations update policy"
    on public.trip_invitations for update to authenticated
    using (
      public.is_trip_member(trip_id, 'owner')
      or inviter_id = (select auth.uid())
    );
  ```

---

#### 2.4 [P1 — MEDIUM] Unauthorized Proposal Mutation by Viewers
- **File:** `supabase/migrations/20261108140000_group_collaboration_and_chat.sql:126–130`
- **Vulnerability Type:** Privilege Escalation
- **Vulnerable Code:**
  ```sql
  create policy "Trip activity proposals update policy"
    on public.trip_activity_proposals for update to authenticated
    using (public.is_trip_member(trip_id, 'viewer'))
    with check (public.is_trip_member(trip_id, 'viewer'));
  ```
- **Attack Vector:** A user with read-only `viewer` role can issue a direct UPDATE on `trip_activity_proposals`, setting `status = 'approved'` or overwriting `proposal_data`.
- **Remediation:** Restrict general proposal updates (status changes) to `editor` or `owner` roles. Viewers may only update the `upvotes` and `downvotes` arrays via dedicated voting functions or column-level security.

---

### 3. Comprehensive Row Level Security (RLS) Status Matrix

All 13 database tables were audited for RLS configuration:

| Table Name | RLS Enabled | Default Deny | SELECT Isolation | INSERT Policy | UPDATE Policy | DELETE Policy | Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `profiles` | YES | YES | Self only (`id = auth.uid()`) | Trigger managed | Self only | Self only | **SECURE** |
| `trips` | YES | YES | Owner or member | Authenticated (`owner_id = auth.uid()`) | Owner or Editor | Owner only | **SECURE** |
| `trip_members` | YES | YES | Trip members | Owner or Editor | Owner only | Owner or Self | **SECURE** |
| `itinerary_days` | YES | YES | Trip members | Owner or Editor | Owner or Editor | Owner or Editor | **SECURE** |
| `itinerary_activities` | YES | YES | Trip members | Owner or Editor | Owner or Editor | Owner or Editor | **SECURE** |
| `budget_line_items` | YES | YES | Trip members | Owner or Editor | Owner or Editor | Owner or Editor | **SECURE** |
| `trip_proposals` | YES | YES | Owner or Editor | Service Role / RPC | Owner or Editor | Owner only | **SECURE** |
| `bookings` | YES | YES | Trip members | Owner or Editor | Owner or Editor | Owner or Editor | **SECURE** |
| `packing_items` | YES | YES | Trip members | Trip members | Trip members | Owner or Editor | **SECURE** |
| `documents` | YES | YES | Trip members | Trip members | Uploader or Owner | Uploader or Owner | **SECURE** |
| `trip_messages` | YES | YES | Trip members | Trip members (`sender_id = auth.uid()`) | No updates | Sender or Owner | **SECURE** |
| `trip_invitations` | YES | YES | **LEAKY** (see 2.3) | Editor or Owner | **LEAKY** (see 2.3) | Owner only | **ACTION REQ** |
| `trip_activity_proposals`| YES | YES | Trip members | Trip members | **BROAD** (see 2.4) | Owner or Editor | **ACTION REQ** |

---

### 4. Secrets, Credentials & Dependency Hygiene

- **API Secrets Verification:**  
  Inspecting git history and code confirms that `GEOAPIFY_API_KEY`, `GEMINI_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are not hardcoded in source files. They are loaded strictly from server-side environment variables.
- **Public Keys:**  
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are exposed to the client, as intended by Supabase's browser auth architecture.
- **Dependency Vulnerabilities (`npm audit`):**  
  `npm audit` reports 0 high and 0 critical vulnerabilities. 8 moderate vulnerabilities are present in `minimatch` within dev-dependency `@typescript-eslint`. No runtime production dependencies are affected.
