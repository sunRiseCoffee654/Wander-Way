# WanderWay

Editable travel planning with grounded details and honest unknowns.

**Status:** Phase 1 foundation complete. The repository contains the Next.js
scaffold, design tokens and a private foundation preview. Trip workflows,
authentication, database access and AI planning are not implemented yet.

## Stack

- **Framework:** Next.js 16 App Router, React 19, TypeScript strict mode
- **Styling:** Tailwind CSS v4 with semantic design tokens
- **UI primitives:** Lucide icons, Motion for purposeful app transitions
- **Data and auth:** Supabase (PostgreSQL, PostGIS, RLS, Auth, Storage)
- **AI planning:** Google Gemini via `@google/genai`
- **Location and routing:** Geoapify
- **Testing:** Vitest unit tests; Playwright E2E to be added with app flows

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

## Environment

Copy `.env.example` to `.env` and provide your own credentials. Never commit
real keys or expose server-only values to the browser.

## Current Foundation

- Strict TypeScript, path aliases, ESLint flat config and Vitest are wired to
  real `typecheck`, `lint`, `test` and `build` scripts.
- `src/app/globals.css` is the single source for the Field Atlas semantic
  palette, typography roles, shape, elevation, focus recipe and motion limits.
- Light and dark themes derive from the same token set through `light-dark()`.
- Public Sans and Newsreader load through `next/font` with system fallbacks.
- The root layout includes a skip link, responsive gutters and reduced-motion
  defaults.
- `/` is an internal foundation preview. It uses an intentional reserved image
  area; no unlicensed photography or fake product state is shipped.
- No 3D, model viewer, scene engine, decorative map or generated destination
  photograph is present.

## Documentation

- [`WanderWay-PRD.md`](./WanderWay-PRD.md) — product requirements
- [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) — architecture and phases
- [`DESIGN.md`](./DESIGN.md) — visual contract and tokens
- [`UI_UX_PLAN.md`](./UI_UX_PLAN.md) — journeys, wireframes and release tasks
- [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) — current delivery state
- [`AGENTS.md`](./AGENTS.md) — engineering rules and product invariants

## Next Step

Phase 2: Supabase schema, PostGIS helpers and default-deny RLS policies. No
migration or deployment is implied by this foundation work.
