# Pricing Integrity Rules
- AI may explain a budget but must not invent supplier prices.
- Label each amount: live quote, published price, user-entered, estimate/allowance or unknown.
- Retain source/provider, fetched-at, currency, validity, availability, fees, taxes and conditions where supplied.
- Expired offers are stale, not bookable.
- Unknown is never zero; never silently substitute an LLM guess.
- Retain FX source and timestamp.
- Use integer minor units or documented decimal arithmetic.
- Totals must be reproducible from line items.
- Test rounding, partial data, refunds, traveller count and room occupancy.
