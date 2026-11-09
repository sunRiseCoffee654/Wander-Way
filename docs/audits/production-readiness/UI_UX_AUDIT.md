# WanderWay v3.0 — Comprehensive Production Readiness Audit
## UI/UX, Product Experience & Accessibility Audit

**Audit Execution Date:** November 9, 2026  
**Auditor:** Senior Product Designer & Accessibility (a11y) Auditor  
**Repository Target:** `d:\Projects\WanderWay`  
**Design Contract:** Google Stitch Material 3 Travel Companion UI Kit & Atlas Editorial Aesthetic  
**Accessibility Target:** WCAG 2.1 AA Compliance

---

### 1. Visual Identity & Design System Compliance

WanderWay v3.0 successfully implements the **Field Atlas** visual identity:
- **Color Palette:** Warm ivory backgrounds (`#fdf8f8`), deep forest teal (`#004b71`), warm sage surfaces, and muted gold accents.
- **Typography:** Modern sans-serif typography (`Plus Jakarta Sans` / `system-ui`) with clear typographic hierarchy, generous line heights, and editorial card styling.
- **Micro-Interactions & Motion:** Restrained, purposeful transitions using Tailwind CSS transitions and GSAP without jarring layout shifts or distracting motion loops.
- **Visual Score:** **8.8 / 10** for visual coherence and aesthetic polish.

---

### 2. Screen-by-Screen UX & Usability Audit

#### 2.1 Home Planning Launcher (`/`)
- **Strengths:** Clean search trigger, interactive `DateRangePicker` popover, quick duration chips ("Weekend (3d)", "1 Week (7d)", "10 Days", "2 Weeks (14d)").
- **Defect Found (BUG-004):** The home page attempts to query `trips.status` on line 29 of `src/app/page.tsx`. Because the database column is `trip_state`, PostgREST returns a schema error, and the user's saved trips section fails to render for logged-in travelers.

#### 2.2 Destination Exploration Hub (`/explore`)
- **Strengths:** Showcase destination cards (Kyoto, Swiss Alps, Oaxaca), live consular travel advisory pill, interactive place details modal.
- **Usability:** Filter chips for themes (Heritage, Nature, Metropolis) allow immediate exploration.

#### 2.3 Trip Command Center (`/trips`)
- **Strengths:** Radial trip readiness gauge, active journey countdown ("T - 4 Days"), metric summary cards (Budget, Weather, Group, Packing).
- **Defect Found (BUG-008):** In the "Explore Popular Destinations" grid (`src/app/(dashboard)/trips/page.tsx:196`), cards link to `/trips/new?destination=${encodeURIComponent(dest.name)}`. However, `NewTripPage` in `src/app/(dashboard)/trips/new/page.tsx:12, 29` inspects `searchParams.dest`. Because the query parameter name differs (`destination` vs `dest`), the wizard input remains blank instead of prefilled.

#### 2.4 Itinerary 60/40 Split View & Map (`/trips/[tripId]` & `/map`)
- **Strengths:** Day selector pill strip, 60/40 desktop split view (Schedule vs MapLibre GL vector map), bidirectional synchronization between schedule items and map markers.
- **Usability:** Activity edit modal enables editing time, title, duration, and notes without full-page reloads.

#### 2.5 Persistent Sidebar Navigation (`src/components/layout/stitch-sidebar.tsx`)
- **Defect Found (BUG-009 — Context Loss):** In `DashboardLayout` (`src/app/(dashboard)/layout.tsx:36, 54`), `activeTripId` is computed by querying the single most recently created trip (`trips.order("created_at").limit(1)`). When a traveler views an older trip (`/trips/[tripId-B]/itinerary`), clicking "Bookings", "Packing", "Budget", or "Itinerary" in the sidebar resolves links using `latestTrip.id` (`/trips/[tripId-A]/bookings`), jarringly kicking the traveler out of trip B's workspace.
- **Remediation:** In `stitch-sidebar.tsx`, extract the active trip ID dynamically from the URL pathname using regex (`/^\/trips\/([^\/]+)/`) before falling back to `activeTripId`.

#### 2.6 Bookings Tracker (`/trips/[tripId]/bookings`)
- **Defect Found (BUG-002):** The server component queries `trips.base_currency`. Because the column is `budget_currency`, the query fails and redirects to `notFound()` (404), completely breaking the page for all trips.

#### 2.7 Smart Packing & Gear (`/trips/[tripId]/packing`)
- **Defect Found (BUG-003):** The server component queries `trips.destination_name`. Because the column is `destination`, the page throws 404 for all trips.

#### 2.8 Profile & Account Settings (`/profile`)
- **Defect Found (BUG-004):** Saving profile settings fails with an error toast because `profile-settings.tsx:98` attempts to upsert `travel_pace` into `public.profiles`. The column only exists on `trips`.

---

### 3. Accessibility (WCAG 2.1 AA) Review

| WCAG Criteria | Requirement | Status | Observations |
|---|---|:---:|---|
| **1.4.3 Contrast (Minimum)** | Text contrast ≥ 4.5:1 | **PASS** | Normal text on warm ivory surface exceeds 8:1; tonal badges exceed 4.5:1. |
| **2.1.1 Keyboard** | All functionality operable by keyboard | **PASS** | Modals, date picker, and dropdowns support `Tab` navigation and `Escape` key dismissal. |
| **2.4.7 Focus Visible** | Visible focus indicator | **PASS** | Interactive controls feature `focus:ring-2 focus:ring-primary focus:outline-none`. |
| **2.5.8 Target Size (Minimum)**| Touch targets ≥ 24×24px (WCAG AAA ≥ 44×44px) | **PASS** | Primary action buttons are 40px–48px; sidebar icons are 44px minimum height. |
| **4.1.2 Name, Role, Value** | Proper ARIA attributes on dynamic widgets | **PASS** | Dialogs declare `role="dialog"` and `aria-modal="true"`. |

---

### 4. Summary of UI/UX Recommendations

1. **Fix Navigation Context in Sidebar:** Update `src/components/layout/stitch-sidebar.tsx` to read the active trip ID from `usePathname()` so navigating tabs retains the selected trip.
2. **Align Query Parameters:** Unify `?dest=` across `/trips` destination cards and `/trips/new` wizard input.
3. **Eliminate 404 Column Errors:** Fix `base_currency` and `destination_name` column queries so Bookings and Packing views render their rich UIs.
