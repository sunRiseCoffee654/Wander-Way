---
name: travel-data-provenance
description: Use for destination news, safety advisories, weather warnings, flight/train status, traffic and road closures.
---
# Travel Data Provenance
1. Read `LIVE_TRAVEL_INTELLIGENCE.md`.
2. Identify authoritative/licensed provider for the geography and data type.
3. Store source, reference, fetched-at, event time, validity, geography and verification status.
4. Distinguish official advisory, provider observation, reputable news and unverified user report.
5. Deduplicate incidents and expire alerts when validity ends.
6. Match alerts to destination, route, dates and saved transport details.
7. State what is known, unknown and what action is reasonable.
8. Never claim a route is safe or a service is on time without current evidence.
9. Handle provider outage and stale data explicitly.
No current source means unknown, not safe/clear.
