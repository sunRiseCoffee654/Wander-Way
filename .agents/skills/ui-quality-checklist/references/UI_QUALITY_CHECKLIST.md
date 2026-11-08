# UI quality review

## Evidence protocol

Review the requested routes/changes and supported themes only; do not expand a light-only product into dark mode just to complete a checklist.

Inspect rendered mobile 375x812, tablet 768x1024, desktop 1440x900, and 320 CSS pixel reflow as relevant. Test 200% text resizing separately; a 1280px viewport at 400% browser zoom is a useful reflow condition. Responsive emulation alone does not prove text resize. Account for tables/maps that legitimately require two-dimensional layout.

Exercise keyboard Tab/Shift+Tab and applicable arrows, Enter, Space, Escape. Inspect order, visible focus, modal entry/exit, skip links, sticky chrome, scrolling and return focus. Check accessible names/roles and selected/expanded/error states, including a screen reader where available.

Stress with 80-character names, 60-character unbroken strings, one-character labels, 99,999+ counts, zero records, missing images, non-Latin/RTL content in supported locales, delayed responses, failed saves, and interrupted actions. Use local fixtures or mocked requests; do not modify real user data for a visual test.

Inspect reduced motion and forced colors where supported. Check text-spacing overrides, font fallback/load, unsized media, console failures and layout shift. Automated tools support but do not replace manual behavior checks.

The blur test can help identify grouping but is optional subjective feedback. A screenshot cannot verify keyboard behavior; a source scan cannot prove rendered contrast. Record method and evidence for each outcome.

## Eight gates

Report PASS, FAIL, NOT APPLICABLE, or NOT TESTED, with the exact page, condition, and evidence. A not-tested gate prevents an unqualified pass.

| Gate | Failure condition | Scope/correction |
| --- | --- | --- |
| 1. Contrast | Required text or meaningful control/state/graphic fails its applicable ratio. | 4.5:1 normal text; 3:1 large text and required non-text information. Apply exceptions; pale decorative borders alone do not fail. Measure actual pairs, not rounded ratios. |
| 2. Keyboard/focus | Required action cannot be operated by keyboard, focus is invisible, trapped unintentionally, or entirely hidden by author-created content. | AA focus-not-obscured minimum is not the same as AAA full visibility or focus appearance. Prefer a strong 2px indicator, but evaluate the actual criterion. |
| 3. Targets | Pointer target fails 2.5.8 and no exception applies. | 24x24 CSS pixels or the precise spacing/equivalent/inline/user-agent/essential exceptions. Prefer larger touch targets. |
| 4. Working controls | Named actions are dead, misrepresented, inaccessible, or produce the wrong result. | Only applicable states are required. Static cards need no hover state; links need no artificial disabled attribute. Native semantics preferred. |
| 5. State/data integrity | Missing required loading/error/recovery, false empty state, duplicated submission, or user input lost on failure. | Verify real data flow and expected state transitions; do not claim payment/booking success without provider confirmation. |
| 6. Reflow/resize | Information/function is lost during required resizing/reflow or unintended page overflow blocks use. | 320 CSS pixels reflow and 200% text resize are separate checks. Essential two-dimensional content may scroll in its own region. |
| 7. Motion/accessibility | Motion prevents task use, required pause/stop/hide behavior is missing, or implemented reduced-motion support is broken. | No blanket WCAG 300/500ms limit; profile actual jank. Reduced-motion handling is a product quality baseline; classify formal criteria accurately. |
| 8. Brief/craft integrity | Rendered output violates an explicit design brief, loads the wrong face, or decoration obscures content. | Gradients, common fonts, and glass effects are not automatic WCAG failures. Explain the concrete problem instead of labeling an aesthetic as P0. |

## Optional 100-point rubric

Use only if a scored review is useful/requested. This is an internal heuristic, not a validated instrument or accessibility certificate.

| Category | Maximum | Assess |
| --- | --- | --- |
| Visual quality | 10 | Intentional hierarchy, grouping, suitable visual expression. |
| Color | 10 | Semantic consistency and tested pairings. |
| Typography | 10 | Loaded faces, readable scale/measure, appropriate numeral alignment. |
| Spacing | 8 | Coherent rhythm and grouping. |
| Layout | 8 | Content priorities, alignment, sensible containers. |
| Navigation | 8 | Wayfinding, active location, exits, narrow-screen access. |
| Responsiveness | 10 | Content at required sizes and zoom. |
| Accessibility | 12 | Semantics, keyboard, names, contrast, targets, status messages. |
| Interactions | 8 | Functionality, state coverage, recovery. |
| Animation | 6 | Purpose, responsiveness, reduced-motion alternatives. |
| Consistency | 5 | Shared roles behave and look consistently. |
| Performance | 5 | Stable layout, measured heavy effects, responsive input. |

Document deductions with evidence, cap each category at its maximum, floor at zero, and sum to 100. A 90-point threshold is a suggested team preference only. If categories are not tested, report an incomplete score rather than silently awarding points or changing the denominator. Critical gate failures cannot be canceled by high visual scores.

## Review output

Start with overall readiness and scope. List actionable defects by severity with location, reproduction condition, impact, evidence, and smallest suggested fix. Separate confirmed defects from untested risks. Include gate outcomes and optional score; close with verification limits. For review-only requests, do not change files.

Sources: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [focus appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

