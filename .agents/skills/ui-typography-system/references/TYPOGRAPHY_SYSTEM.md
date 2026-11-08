# Typography system

## Choose and load

Inspect existing font loaders and licenses first. Match the task's tone, language/script coverage, readability, and density. One family can suffice; a display/body pairing and optional mono family are useful only when roles differ.

| Direction | Possible heading/body choices | Optional mono |
| --- | --- | --- |
| Technical/product | Geist Sans, Inter, Mona Sans | Geist Mono, JetBrains Mono |
| Editorial | Newsreader, Instrument Serif, Fraunces with a readable sans body | IBM Plex Mono |
| Creative/consumer | Plus Jakarta Sans, Outfit, licensed geometric alternatives | Geist Mono |
| Institutional/admin | IBM Plex Sans, Inter | IBM Plex Mono |

These are examples, not installed assets or confirmed license grants. Verify font availability, permitted hosting, weights, subsets, and script coverage. Do not redistribute proprietary brand fonts. System stacks and Inter are valid deliberate choices.

Load through the existing framework loader or @font-face. Use font-display and metric-compatible fallbacks to manage layout shifts; preload only critical actual faces. Verify network loading and the computed face. Default antialiasing overrides are unnecessary and platform-specific.

Use font-variant-numeric: tabular-nums for aligned metrics, times, tables, and financial columns, not all body numerals. Prefer high-level font-variant settings to overwriting inherited feature sets with font-feature-settings. Enable stylistic sets only when the font supports and benefits from them.

## Twelve role groups

Sizes assume a 16px default root only for illustration; preserve user font-size preferences. Derive responsive choices from content, not a mandatory desktop size.

| Role | Mobile to desktop | Starting size | Weight / line-height / tracking |
| --- | --- | --- | --- |
| Display | 36-64px | clamp(2.25rem, 1.75rem + 2.5vw, 4rem) | 600 / 1.08 / -0.03em |
| Page title | 28-44px | clamp(1.75rem, 1.464286rem + 1.428571vw, 2.75rem) | 600 / 1.15 / -0.025em |
| Section heading | 22-32px | clamp(1.375rem, 1.196429rem + 0.892857vw, 2rem) | 600 / 1.25 / -0.02em |
| Subsection heading | 18-24px | clamp(1.125rem, 1.017857rem + 0.535714vw, 1.5rem) | 600 / 1.3 / -0.015em |
| Card title | 16-20px | clamp(1rem, 0.928571rem + 0.357143vw, 1.25rem) | 600 / 1.35 / -0.01em |
| Lead | 17-19px | clamp(1.0625rem, 1.026786rem + 0.178571vw, 1.1875rem) | 400 / 1.55 / normal |
| Body | 16px | 1rem | 400 / 1.55 / normal |
| Supporting | 14px | 0.875rem | 400 / 1.5 / normal |
| Label | 14px | 0.875rem | 500 / 1.428571 / normal |
| Button | 14-16px | 0.875rem or 1rem | 500 / 1.4 / normal |
| Caption | 12px | 0.75rem | 400-500 / 1.4 / optional 0.015em |
| Eyebrow / code | 12 / 13px | 0.75rem / 0.8125rem | 600 / 1.3 / 0.06em eyebrow; 400 / 1.5 / normal code |

These fluid examples interpolate between 320 and 1440 CSS pixels at the assumed root size. rem+vw does not itself guarantee 200% text resizing: clamping, viewport changes, user preferences, and browser zoom interact. Verify behavior and replace fluid sizing with simpler rem rules where needed. A max/min ratio below 2.5 is not a conformance test.

Corrected math: 14px at line-height 1.25 is 17.5px, not 20px; 12px at 1.4 is 16.8px, not 16px. Avoid tight fixed boxes that clip at increased text spacing.

## Readability and semantics

Use roughly 50-75ch for long Latin-script prose as a starting point, not a fixed pixel conversion. The ch unit measures the font's zero glyph, not average character count. Adapt measures for script and content.

Keep control labels distinct from multiline copy. Let long/localized buttons wrap or adapt; do not enforce nowrap everywhere. Use min-height with padding, not hard height that cuts off text. Tight negative tracking is inappropriate for some scripts, small text, and fonts.

Choose headings by document structure, not the desired font size. A card title need not always be h4. Usually use one main h1, with meaningful nested headings.

Verify long words/URLs, 80-character names, fallback fonts, missing glyphs, RTL, supported locales, 200% resize, 320 CSS pixel reflow, and WCAG text-spacing overrides (1.5 line-height, 2x font-size paragraph spacing, 0.12em letter-spacing, 0.16em word-spacing) without content/function loss. Do not hide essential text behind ellipses without an accessible way to reveal it.

Sources: [WCAG resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Utopia](https://utopia.fyi/).

