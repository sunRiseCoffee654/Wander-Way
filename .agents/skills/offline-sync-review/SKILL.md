---
name: offline-sync-review
description: Use when adding/changing offline reads/writes, local persistence, sync queues, retries or conflict resolution.
---
# Offline Sync Review
1. Identify data safe/useful to cache locally.
2. Classify operations as read-only, queueable mutation or online-only.
3. Define local schema, versioning, retention and secure-data handling.
4. Give queued mutations stable IDs and idempotency keys.
5. Define retry/backoff, connectivity recovery and permanent failure.
6. Define conflict policy per entity; never blindly last-write-wins for money or permissions.
7. Preserve unsynced edits and expose sync state.
8. Handle duplicate delivery, partial batch success and app termination.
9. Test airplane mode, intermittent network, token expiry, duplicates and conflicts.
10. Document offline-unavailable functions.
Never imply a mutation is synced until the server confirms it.
