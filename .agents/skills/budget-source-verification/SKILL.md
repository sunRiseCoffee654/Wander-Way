---
name: budget-source-verification
description: Use whenever implementing, displaying or reviewing trip prices, estimates, currency conversion, expenses or settlements.
---
# Budget Source Verification
1. Read budget specifications and pricing-integrity rules.
2. Classify every amount: live quote, published price, user-entered, estimate/allowance or unknown.
3. Require provenance, retrieval time, currency, validity, availability and conditions where available.
4. Normalize provider results without discarding fees/exclusions.
5. Mark stale/expired offers; never present them as currently bookable.
6. Keep AI narrative separate from numeric price authority.
7. Use deterministic money arithmetic and explain line-item totals.
8. Test partial provider data, unavailable prices, FX, taxes, rounding, travellers and refunds.
9. If no trustworthy source exists, show unknown or an explicitly labelled allowance.
Never fill missing market prices with an LLM guess.
