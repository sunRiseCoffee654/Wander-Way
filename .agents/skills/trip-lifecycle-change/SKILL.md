---
name: trip-lifecycle-change
description: Use when changing trip creation, planning, generation, review, saving, upcoming, active, completed or archived workflows.
---
# Trip Lifecycle Change
1. Read `AGENTS.md`, product logic rules and `docs/specifications/TRIP_LIFECYCLE.md`.
2. Identify the state machine: trip, generation, booking or quote.
3. Document states, legal transitions, guards and side effects.
4. Identify impacted screens, APIs, tables, notifications, caches and offline behaviour.
5. Define idempotency and retry semantics.
6. Add transition and negative-path tests.
7. Preserve user edits and prevent duplicate side effects.
8. Update lifecycle docs and report migration/backfill needs.
Never use one generic status field for unrelated lifecycles.
