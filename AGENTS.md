# WanderWay Project Engineering Rules (AGENTS.md)

This file sets the primary operating standards, architectural boundaries, and execution protocols for agents working in the WanderWay repository.

---

## 1. Core Architecture & Tech Stack

- **Platform:** Modern Web Application (Responsive: Mobile viewport to Desktop).
- **Frontend:** TypeScript (strict mode), React / Web framework, Tailwind CSS, minimal purposeful motion.
- **Backend & Database:** Supabase (PostgreSQL with PostGIS for spatial queries, Row Level Security (RLS) for data isolation, Supabase Auth, Supabase Storage).
- **AI Planning Engine:** Google Gemini API via official `@google/genai` SDK.
- **External Providers:** Location & routing providers (e.g. Geoapify / official APIs) for coordinates and transit metrics.
- **Directory Boundaries & Ownership:**
  - `src/` (or web app root): UI components, routing, client state, and responsive views only.
  - `src/lib/supabase/`: Supabase client, queries, and auth helpers.
  - `src/lib/budget/`: Deterministic budget calculations, price evidence normalization, and split math.
  - `supabase/`: Database schemas, SQL migrations, RLS policies, and seed scripts.
  - `tests/`: Unit tests, integration tests, and Playwright browser E2E suites.

---

## 2. Antigravity Execution Loop: Explore → Grill → Plan → Steer → Learn

1. **Explore & Grill Before Coding:**
   - Stack `/plan /grill-me` before modifying code for non-trivial features.
   - The agent must inspect the repository first, then ask structured, single questions with recommended defaults to pin down edge cases and schemas.
2. **Implementation Plan Artifacts:**
   - For changes touching more than 2 files or altering database schemas, produce an **Implementation Plan** artifact with Mermaid architecture/state diagrams and file diff previews.
   - Adjust plans via inline artifact comments rather than re-prompting from scratch.
3. **Execution with `/boost`:**
   - Use `/boost` for multi-step tasks, coordinating implementation with independent validation.
4. **Deterministic Verification Loop:**
   - Every code edit must be validated against a deterministic check:
     - Run `npm run typecheck` (or `tsc --noEmit`).
     - Run unit/integration test suites (`npm test`).
     - For web UI flows, verify via the built-in side-pane browser or browser sub-agent.
5. **Knowledge Distillation & Hygiene:**
   - Use `/learn` when corrections or architectural discoveries occur to update rules or skills.
   - Keep diffs scoped and atomic (100–250 lines).

---

## 3. Product Invariants & Data Integrity (PRD v3.0 Compliance)

- **AI Suggests; Verified Services Validate:**
  - Gemini AI may suggest itineraries, explain activities, and draft plans.
  - AI must **never** invent exact GPS coordinates, fabricate live prices, or claim reservations/availability.
- **Pricing Integrity & Evidence Types:**
  - Every numeric price must carry an explicit evidence type:
    `live_quote` | `published_price` | `verified_range` | `calculated_estimate` | `user_entered` | `unknown`
  - Unknown costs must **never** be treated as zero or replaced with hallucinated figures.
  - All currency calculations must use safe decimal or integer minor-unit arithmetic with retained conversion rates and timestamps.
- **User Control Outranks Generation:**
  - Generated itineraries are proposals. User edits (add, delete, reorder, adjust times) are authoritative and must never be silently overwritten by regeneration.
- **Security & Authorization:**
  - Default deny. All tables in Supabase must have RLS enabled with explicit policies for owners, members, and collaborators.
  - Never expose service-role keys or sensitive credentials in client-side bundles.

---

## 4. Terminal & Context Efficiency

- Prefer native shell tools (`rg`, `fd`, `git status -sb`, selective file reads) to inspect files quickly rather than dumping large files into context.
- Keep agent responses concise and focused on actionable changes, evidence, and next steps.

