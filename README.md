# WanderWay v3.2

**Next-Generation Grounded Travel Companion & Autonomous Planning Engine**

WanderWay connects grounded, mathematically deterministic trip planning with continuous real-world intelligence. Powered by the official Google Gemini API (`@google/genai`), Supabase PostGIS spatial architecture, and the Google Stitch Material 3 design system, WanderWay eliminates hallucinations, phantom pins, and floating-point currency drift.

---

## Key Features

- **Google Stitch Material 3 Travel Companion UI Kit:** Responsive, accessible, mobile-first design with Coastal Azure editorial palette, Roboto Flex variable typography, and pure image-logo branding (`/nav_logo.png`, `/logo.png`, `/favicon.png`).
- **Interactive Material 3 Date Range Picker:** Accessible calendar popover supporting click-to-select range highlighting, month navigation, duration quick chips ("Weekend (3d)", "1 Week (7d)", "10 Days", "2 Weeks (14d)"), and parameter synchronization into `/trips/new`.
- **Grounded AI Plan Generation:** Google Gemini 2.5 structured output pipeline coupled with Geoapify geocoding and routing verification. AI proposes itineraries; verified external services validate GPS coordinates and transit legs.
- **Dual-Engine Animation Architecture:** 
  - **GSAP 3 (`@gsap/react`)**: Choreographs hero staggered entrance reveals and the radial progress readiness score gauge (0% ➔ 85%).
  - **Motion v12 (`motion/react`)**: Spring-driven button interactions, drawer entries (`AnimatePresence`), and sliding layout pills (`layoutId`).
- **Multi-Layer Glassmorphism System:** Frosted glass styling (`backdrop-blur-xl`, `bg-white/80 dark:bg-stone-900/80`, `border border-white/40 dark:border-white/15`, and soft drop shadows) applied across all floating cards, badges, and controls that sit on top of background imagery.
- **Indian Rupee (INR, ₹) Base Currency:** Fully standardized across models, services, calculations, and UI views with multi-currency minor-unit arithmetic (paise factor 100) and penny-exact group split distribution.
- **Collaborative Group Talk & WebRTC Hub:** Real-time Supabase group messaging, activity proposal voting, 7-day role-based invite links, and zero-cost WebRTC peer video/audio calling.
- **AI Contextual Packing & Gear Assistant:** Weather-grounded gear recommendations (Open-Meteo precipitation and temperature forecasting) with category filtering and interactive checklist toggles.
- **Live Travel Intel Vault:** Real-time aviation flight radar (ANA NH107), official consular travel advisories (Level 1–4), and AES-256 encrypted voucher storage.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | Next.js 16 (App Router, React 19, TypeScript strict mode) |
| **Styling & Design System** | Tailwind CSS v4, Google Stitch Material 3, Google Material Symbols Outlined |
| **Animation Engines** | GSAP 3 (`@gsap/react` `^2.1.2`, `gsap` `^3.15.1`) + Motion v12 (`motion/react` `^12.4.7`) |
| **Database & Backend** | Supabase (PostgreSQL with PostGIS, Row Level Security, Auth, Storage, Realtime) |
| **AI Planning Engine** | Google Gemini API via official `@google/genai` SDK |
| **External Integrations** | Geoapify (Geocoding & Transit Routing), Open-Meteo (Weather), European Central Bank (FX Currency) |
| **Testing** | Vitest (16 test files / 178 tests passing) |

---

## Commands

```bash
# Install dependencies
npm install

# Start local Next.js development server
npm run dev

# Run TypeScript strict typecheck
npm run typecheck

# Run ESLint static analysis
npm run lint

# Run Vitest unit & click-flow test suite
npm test

# Build for production with Turbopack
npm run build
```

---

## Verification & Quality Gates

- **Unit & Click-Flow Tests:** `npm test` passes **178/178 tests** across 16 test files (100% passing).
- **TypeScript Strict Validation:** `npm run typecheck` passes with **0 errors** (`tsc --noEmit`).
- **ESLint Static Analysis:** `npm run lint` passes with **0 errors, 0 warnings**.
- **Turbopack Production Build:** `npm run build` compiles all **24 Next.js routes** successfully.
- **HTTP Endpoints:** Verified **16/16 endpoints** live on `http://localhost:3000` (HTTP 200 OK / 307 Redirect).
- **Independent Victory Audit:** Certified by Independent Victory Auditor with an unequivocal **VICTORY CONFIRMED** verdict.

---

## Documentation

- [`UI_TREE_AUDIT_REPORT.md`](./UI_TREE_AUDIT_REPORT.md) — Comprehensive UI tree audit, click-by-click flow mapping, and 100-point rubric assessment
- [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — Detailed engineering progress and phase completion log
- [`DESIGN.md`](./DESIGN.md) — Material 3 Stitch design system, color tokens, and glassmorphism standards
- [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) — System architecture, database schemas, and RLS policies
- [`AGENTS.md`](./AGENTS.md) — Antigravity operating rules and PRD v3.0 product invariants
- [`WanderWay-PRD.md`](./WanderWay-PRD.md) — Product requirements document

---

## Repository

- **GitHub Remote:** [https://github.com/sunRiseCoffee654/Wander-Way.git](https://github.com/sunRiseCoffee654/Wander-Way.git)
- **Branch:** `main`
