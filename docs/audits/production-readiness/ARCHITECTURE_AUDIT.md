# WanderWay v3.0 — Comprehensive Production Readiness Audit
## Architecture, Systems Design & Scalability Audit

**Audit Execution Date:** November 9, 2026  
**Auditor:** Independent Software Architecture Review Team  
**Repository Target:** `d:\Projects\WanderWay`

---

### 1. Architectural Blueprint & Component Map

WanderWay v3.0 is designed as a modern, multi-tier web application structured around Next.js App Router and Supabase:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Next.js 16 / React 19)            │
│  - Presentation: Tailwind CSS v4, Lucide Icons, Material Symbols 3     │
│  - Navigation: Persistent Desktop Sidebar (72 units) & Mobile Drawer   │
│  - Visual Map Engine: MapLibre GL + Geoapify Vector Tiles + SVG Fallback│
│  - Offline / PWA: Service Worker (public/sw.js) + IndexedDB Cache      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / Server Actions / Cookies
┌────────────────────────────────────▼───────────────────────────────────┐
│                    NEXT.JS SERVER LAYER (Node.js 20+ Runtime)          │
│  - Middleware: Canonical redirects (/auth/login -> /login?next=...)    │
│  - Route Handlers: /api/trips/*, /api/weather, /api/advisories, etc.   │
│  - Server Actions: src/lib/bookings, src/lib/vault, src/lib/itinerary  │
│  - Supabase SSR Client: @supabase/ssr with secure cookie exchange      │
└───────────────────┬─────────────────────────────────┬──────────────────┘
                    │                                 │
┌───────────────────▼─────────────┐   ┌───────────────▼──────────────────┐
│      EXTERNAL PROVIDERS         │   │   DATABASE LAYER (Supabase)      │
│  - Google Gemini API (v3 SDK)   │   │  - PostgreSQL 15+ Core Relational│
│    (Creative Schedule & Narrative)│  │  - PostGIS 4326 Spatial Points   │
│  - Geoapify APIs                │   │  - Row Level Security (13 tables)│
│    (Geocoding, Places, Routing) │   │  - PL/pgSQL Atomic RPCs          │
│  - Open-Meteo & Consular APIs   │   │  - Supabase Realtime Channels    │
└─────────────────────────────────┘   └──────────────────────────────────┘
```

---

### 2. Core Architectural Invariants (PRD v3.0 Compliance)

#### 2.1 Invariant 1: "AI Suggests; Verified Services Validate"
- **Implementation Status: VERIFIED & SOUND**
- **Mechanism:** In `src/lib/ai/grounding.ts` and `src/lib/ai/schema.ts`, the Gemini 2.5 prompt schema prohibits lat/lng output. The AI emits candidate activities with title, description, and query. The `groundPlace()` service resolves coordinates using Geoapify Places search anchored to the destination's geocoded centroid.
- **Empirical Boundary:** A 50 km spatial radius check (`MAX_DISTANCE_KM = 50`) ensures suggested points are geographically bound to the target destination.

#### 2.2 Invariant 2: "Pricing Integrity & Evidence Types"
- **Implementation Status: PARTIALLY VERIFIED — LEAK IN DEBT SETTLEMENT**
- **Mechanism:** In `src/lib/currency/types.ts` and `src/lib/currency/service.ts`, money amounts are modeled exclusively as integer minor units (`amount_minor_units: number`, bigint in PostgreSQL). Floating point calculations are strictly rejected.
- **Identified Defect:** While single-trip currency formatting preserves minor units, `src/lib/budget/settlement.ts` blindly sums expenses without normalizing or verifying that currencies match across line items.

#### 2.3 Invariant 3: "User Control Outranks Generation"
- **Implementation Status: VERIFIED**
- **Mechanism:** AI generation creates staging records in `trip_proposals`. Generated activities are never inserted directly into live itineraries. The user must review candidates in `proposal-review-client.tsx` and selectively apply them via `apply_trip_proposal`. Furthermore, activities carry `is_user_edited: boolean`, protecting user-customized items from automated batch deletion.

---

### 3. Architectural Strengths

1. **Clean Separation of Concerns:**  
   UI components (`src/components/`) remain decoupled from low-level data fetching. Business logic (budget split math, debt settlement algorithms, transit geometry calculations) resides in pure, framework-agnostic TypeScript functions in `src/lib/`.
2. **Deterministic Financial Math:**  
   The core budget calculation engine (`src/lib/budget/calculations.ts` and `src/lib/currency/service.ts`) uses strict minor-unit arithmetic, preventing rounding drift across multi-person splits.
3. **Resilient Map Fallback Strategy:**  
   `vector-itinerary-map.tsx` gracefully falls back from MapLibre GL vector tiles to an interactive SVG topology diagram if WebGL context or Geoapify API keys are unavailable.
4. **Offline First PWA Architecture:**  
   Service worker precaching (`public/sw.js`) and IndexedDB vault persistence (`src/lib/offline/storage.ts`) allow travelers to access vouchers, emergency advisories, and itineraries offline during transit.

---

### 4. Architectural Weaknesses & Coupling Risks

1. **Silent Fallback to Ephemeral In-Memory Maps:**  
   In `src/lib/bookings/actions.ts` (`BOOKINGS_STORE`) and `src/lib/vault/actions.ts` (`VAULT_STORE`), mutations that fail against Supabase are caught in try/catch blocks and stored in module-scoped `Map` instances. On serverless hosting (e.g. Vercel), module memory is stateless across cold starts, resulting in permanent, silent data loss.
2. **Serial Network Waterfall in AI Plan Generation:**  
   In `src/lib/ai/grounding.ts`, place geocoding and routing legs execute sequentially for every proposed activity, producing generation response times of 10–14 seconds. Batching or parallel `Promise.allSettled` execution is required.
3. **Tight Coupling to Schema Column Names without Type-Safe ORM:**  
   Database queries use raw string column selectors (`.select("id, title, destination_name")`). When columns in migrations diverge from code (`destination` vs `destination_name`, `trip_state` vs `status`), TypeScript type checking does not detect the mismatch at compile time, leading to silent runtime 404s.

---

### 5. Serverless Scalability & Concurrency Risks

1. **RPC Signature Drift:**  
   Migration `20261108100000_fix_proposal_booking_hint.sql` updated `apply_trip_proposal` to take `(p_proposal_id, p_trip_id, p_selected_activity_ids)`. Because PostgreSQL functions overload by signature, calling it with 2 parameters from `apply-proposal/route.ts` invokes an outdated schema or errors out.
2. **Connection Pooling & Supabase Client Instantiation:**  
   Server components invoke `createClient()` on every request. While `@supabase/ssr` manages cookie-based sessions, background traffic bursts must leverage Supabase Transaction Pooler (port 6543 / PgBouncer) to prevent PostgreSQL connection exhaustion.

---

### 6. Architectural Recommendations

1. **Eliminate Ephemeral Map Fallbacks in Production:**  
   Replace in-memory fallback stores with hard failures or local IndexedDB write-through caches. Server actions must throw or return explicit database errors so users are aware of persistence failures.
2. **Parallelize Grounding Pipeline:**  
   Refactor `groundPlace()` and transit calculation in `src/lib/ai/grounding.ts` into parallel workers using `Promise.all` with a concurrency limiter (e.g. 5 concurrent requests).
3. **Adopt Generated Supabase Database Types:**  
   Enforce `supabase gen types typescript` across all Supabase queries to eliminate string column mismatches at compile time.
