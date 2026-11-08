# Design research and decision guide

## Research deliverable

Produce a concise design brief: user and task; known constraints; one or two precedents; observed structural pattern; proposed adaptation; rejected mismatches; and evidence/uncertainty. Distinguish observation, inference, and normative requirements.

Do not repeat the source report's precise brand font weights, component counts, accent percentages, or internal token values as verified facts. Those came largely from third-party snapshots, can change, and do not establish universal rules.

## Benchmark families

| Precedent | Useful question | Avoid importing blindly |
| --- | --- | --- |
| Apple | How do imagery, type, and negative space establish hierarchy? | Proprietary fonts, huge empty space in operator tools. |
| Linear | How do dense navigation, keyboard flows, and surface hierarchy work together? | Dark mode as a requirement for all products. |
| Stripe | How are complex transactions and developer concepts explained clearly? | Decorative marketing gradients in every application panel. |
| Vercel Geist | How are tokens, compact labels, and structural dividers coordinated? | Visible blueprint grids on every page. |
| Framer | How do product demonstrations support creative workflows? | Artboard density or animation without task relevance. |
| Notion | How do content blocks and disclosure support documents? | Reproducing a presumed brand palette from a snapshot. |
| Raycast | How are command search, shortcuts, and quick repeated actions handled? | Keyboard-only paths or dark-only assumptions. |
| Figma | How are tool chrome and expressive brand storytelling separated? | Confusing marketing layouts with the editor interface. |
| Airbnb | How do search, photos, filters, and concise metadata aid comparison? | Dense imagery where precise data entry is the task. |
| GitHub Primer | How do semantic tokens and component behaviors scale? | Treating its names and dimensions as web standards. |
| Shopify Polaris | How do merchant tasks, forms, and tables prioritize action? | Assuming a current package API from an older example. |
| IBM Carbon | How do spacing, grid, and enterprise data density relate? | Enforcing Carbon breakpoints on an established different grid. |
| Atlassian / Material | How do role-based type and state systems support consistency? | Mixing several systems' visual and behavioral conventions. |

Official product systems provide implementation examples. WCAG defines accessibility criteria; APG supplies widget guidance. Marketing pages and third-party galleries provide observations, not conformance proof.

## Translate usability principles into testable decisions

- Status visibility: acknowledge input promptly, show pending/saved/error states, and avoid announcing each keystroke.
- User control: give exits, recoverable actions, and clear destructive consequences. Undo is appropriate only when reversal actually exists.
- Recognition: use visible field labels, meaningful action names, predictable placement, and discoverable shortcuts.
- Error prevention/recovery: validate at useful times, retain user input, identify affected fields, and offer a concrete recovery path.
- Fitts: make frequent targets easy to reach and generously sized; avoid crowded destructive actions. Physical distance is only one task consideration.
- Hick: reduce competing choices and group related options. Do not infer an arbitrary universal limit of three or four choices.
- Gestalt: use proximity, similarity, and region to communicate grouping. Twice the internal gap is a starting heuristic, not required math.
- Progressive disclosure: defer rare complexity without hiding needed information. Use a wizard when dependencies and user effort benefit; preserve previous input.
- Working memory: group concepts meaningfully; do not treat seven-plus-or-minus-two or the 80/20 rule as mandatory UI counts.
- Input flexibility: normalize harmless formatting, preserve leading zeros and locale meaning, and apply domain/server validation.
- Defaults: infer only reliable, appropriate values and let users change them. Browser locale does not reliably determine location or desired currency.
- Optimism: use optimistic updates only with a safe rollback/reconciliation path; never suggest a booking or payment succeeded before confirmation.
- OTP: prefer a single accessible input with autocomplete and paste support; segmented visuals must preserve editing, autofill, and screen-reader usability.

## Motion decision guide

| Need | Starting choice | Verify |
| --- | --- | --- |
| Hover/press feedback | CSS, roughly 100-150ms; scale feedback is optional. | Touch and reduced-motion operation. |
| Popover/dialog transition | CSS or existing animation library, roughly 150-250ms ease-out. | Origin, focus timing, and interruption. |
| Drawer/sheet | Distance-appropriate transition, often 200-400ms. | Gesture alternatives, no delayed interaction. |
| Repeated keyboard selection | Immediate logical state and minimal decoration. | Fast typing never falls behind effects. |
| React exit/shared layout/gestures | Existing Motion integration if needed. | Current API and lifecycle cleanup. |
| Choreographed campaign/SVG scene | GSAP if justified by the brief. | Cleanup, performance, accessible reading order. |
| Simple visibility response | IntersectionObserver or native capabilities. | Content remains available if animation fails. |
| Smooth scrolling | Native scrolling first; Lenis only for a concrete benefit. | Anchors, keyboard, focus scrolling, nested scroll areas, reduced motion. |

Use transform and opacity as performance-friendly defaults. CSS itself does not guarantee compositor execution; clip-path, filters, layout properties, and custom properties depend on browser implementation and effects. Profile meaningful scenes instead of asserting GPU-only performance. Layout animation can be appropriate if it avoids harmful shifts and meets the budget.

Reduced motion should remove or simplify nonessential spatial motion and looping decoration. Instant updates are valid. A 150ms fade is an option, not a mandatory replacement. Respect pause/stop/hide requirements for applicable automatically moving content. A universal duration or swipe velocity threshold cannot certify accessibility.

Choose library versions, imports, licensing, and bundle costs from current official docs and the installed project. The report's historical dates, package weights, and Lenis option names are not an API contract.

## Corrected source assumptions

- OKLCH improves perceptual control but is not perfectly uniform and cannot guarantee WCAG contrast from lightness alone.
- APCA scores and WCAG 2 contrast ratios are different measures.
- 24 CSS pixel target rules have explicit exceptions; 44 CSS pixels is an enhanced target recommendation/AAA criterion.
- A 2px outline is a useful focus recipe; the AAA criterion concerns area and contrast change, not a universal AA outline width.
- 200% text resizing and 320 CSS pixel reflow are different tests.
- A border can be decorative. The 3:1 non-text rule applies to information needed to identify controls, states, or meaningful graphics.
- Fonts, gradients, shadows, and radius preferences are aesthetic choices, not accessibility failures.
- A heuristic score never proves WCAG conformance or user success.

Primary references: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [APG](https://www.w3.org/WAI/ARIA/apg/), [Nielsen heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [CSS Color 4](https://www.w3.org/TR/css-color-4/).

