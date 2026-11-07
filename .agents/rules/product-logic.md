# Product Logic Rules
- Model trip, generation, booking and quote lifecycles independently.
- Define states, legal transitions, guards, side effects and terminal states before coding.
- User edits outrank generated suggestions.
- Recalculate only affected dependent data.
- Destination/date/traveller/mode changes invalidate relevant quotes, routes and forecasts.
- Persist important transitions and make retries idempotent.
- Derive UI visibility from domain state and permissions.
- Define cancellation, failure, retry and partial-success behaviour.
