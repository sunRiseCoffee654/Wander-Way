# WanderWay Proposed Design Contract

**Date:** 7 November 2026  
**Status:** Revised after owner direction and independent plan review; no application implementation is claimed. Historical asset-inventory statements are superseded by the 3D cleanup recorded in UI_UX_PLAN.md.  
**Direction:** Field Atlas — strictly 3D-free editorial travel planning.  
**Companion specification:** [UI_UX_PLAN.md](UI_UX_PLAN.md) defines journeys, routes, release gates, wireframes, state machines and implementation tasks.

## 1. Purpose and visual authority

WanderWay connects an editable trip plan to reliable real-world context. The interface should feel inviting when choosing a destination and dependable when finding a booking, changing a day or checking a cost. Composition and useful content provide character; operational precision provides trust.

The public website uses documentary travel photography, editorial type and asymmetrical image/text composition. The application uses familiar controls, clear sections, solid surfaces and compact but comfortable rows. Its signature is a numbered waypoint sequence shared by itinerary, selected-day map and Today. Numbering expresses activity order, not a claim that a place, price or route is verified.

The public signature is the explicit Before / Preview / After detour example in UI_UX_PLAN.md section 3.7, preserving a traveller's note as their day changes. Section 3.6 supplies canonical homepage content, image acquisition briefs and desktop/mobile composition. Operational screens express the same identity through time/waypoint alignment and purposeful hierarchy.

**Owner constraint:** no 3D models, model viewers, scene engines, terrain/extrusions/globes, perspective-tilted UI, Spline embeds or 3D-rendered PNG substitutes. Use HTML/CSS, flat SVG and licensed real photography. Geographic maps remain functional flat 2D views with a complete list equivalent. No marketing map library or decorative GPU scene. The former `assets/3d/` and `public/assets/3d/` experiment directories were removed in full and must not be recreated.

The PRD and project rules outrank aesthetic heuristics. All components must preserve manual edits, unknown costs, source/freshness distinctions, actual save outcomes and permissions. No mockup is evidence of a working provider integration. Do not advertise unavailable features.

### Design decisions

- Primary action: lagoon. Copper is a restrained public/editorial accent, not a second competing application CTA.
- Density: moderate in the application, higher only in ledger/itinerary rows; generous on public discovery. No hero-sized metrics inside trip workflows.
- Shape: small control corners, medium grouped surfaces, slightly larger image corners. Open lists instead of cards inside cards.
- Elevation: reserved for genuine floating layers. No persistent glass, grain, gradients or decorative map contours.
- Theme: Light/Dark/System through semantic variables; system preference by default. Photos retain natural color in both modes. A dark theme is not image inversion.
- Icons: the repository's planned Lucide family. Use consistent stroke weight and visible labels for common actions; never mix unrelated icon families to add personality.

## 2. Canonical semantic colors

Opaque sRGB HEX values below are the proposal's canonical primitives mapped directly to semantic roles. Introduce component aliases only when multiple components need the same additional role. Do not duplicate token sources in Tailwind configuration and component files. Implementation can express references through CSS variables and the version-appropriate Tailwind theme mapping.

| Semantic role | Light | Dark | Allowed use |
| --- | --- | --- | --- |
| `canvas` | `#F2F6F4` | `#101C19` | Page ground |
| `surface` | `#FFFFFF` | `#172622` | Main forms, content panels |
| `surface-elevated` | `#F8FBF9` | `#20332D` | Floating panel or selected surface hierarchy |
| `text-primary` | `#152E2B` | `#EEF5F0` | Titles, essential body, amounts |
| `text-secondary` | `#435C57` | `#B7C9BE` | Supporting explanation |
| `text-muted` | `#536B65` | `#9DB4A7` | Timestamps and secondary metadata; still readable |
| `primary` | `#08594F` | `#92D5B8` | Main action fill, links/selected route strokes on permitted surfaces |
| `primary-hover` | `#06483F` | `#ACE2CA` | Primary pointer hover |
| `primary-active` | `#043A33` | `#C3ECDC` | Primary pressed |
| `on-primary` | `#FFFFFF` | `#10271F` | Content on all three primary fills |
| `accent` | `#9A3F20` | `#F2B391` | Public editorial emphasis, limited decorative detail |
| `accent-hover` | `#80331A` | `#F6C5AA` | An actual accent interaction, if required |
| `accent-active` | `#692915` | `#F9D8C5` | Pressed accent interaction |
| `on-accent` | `#FFFFFF` | `#331D12` | Content on all three accent fills |
| `border-subtle` | `#D4DFDA` | `#344E42` | Decorative grouping dividers, never sole control affordance |
| `control-border` | `#738C83` | `#7D9C8B` | Required input boundaries and meaningful inactive-state outlines |
| `focus` | `#005FCC` | `#9AC7FF` | Focus outline outside a surface-colored separation ring |
| `selected-bg` | `#D8EEE5` | `#244C3D` | Selected list row/day choice |
| `on-selected` | `#074E43` | `#D5F5E6` | Text on selected background |
| `disabled-bg` | `#E2EAE5` | `#26392F` | Disabled control fill |
| `disabled-text` | `#536B65` | `#9DB4A7` | Disabled label, with semantic disabled state and nearby reason |
| `success-fg` | `#1A6243` | `#9AD8B0` | Genuine acknowledged success |
| `success-bg` | `#E4F2E8` | `#1D3D2C` | Success message surface |
| `warning-fg` | `#7A4B00` | `#F2CF7D` | Incomplete/stale/attention text |
| `warning-bg` | `#FFF1CC` | `#44361B` | Attention surface |
| `error-fg` | `#A1292F` | `#FFB4B7` | Validation/failure/destructive text |
| `error-bg` | `#FCE8E8` | `#4B2429` | Failure surface |
| `info-fg` | `#1B5390` | `#A9CCFF` | Informational/source text |
| `info-bg` | `#E8F1FC` | `#223B56` | Informational surface |

Secondary buttons use surface/text-primary/control-border; hover uses selected-bg/on-selected and pressed uses the same fill plus a primary-colored boundary. Ghost buttons use the surrounding surface and text-primary, then selected-bg/on-selected on hover/press. Links use primary with a persistent underline in prose, a stronger underline on hover, and an immediate focus outline. Selected controls use on-selected, a visible selected indicator and a primary boundary; color alone is insufficient. Error fields use error-fg boundary plus icon/message; status colors on a standard surface and each declared status pair were checked.

Destructive actions use error-fg text/border on surface or error-bg; do not infer an unmeasured solid destructive-button pairing. A new fill needs an explicit on-color measurement. Pending controls retain normal readable colors and a “Saving” label with duplicate-submission prevention. Disabled appearance is not a loading state. Do not lower alpha on whole components and accidentally weaken text/focus contrast.

Map marker labels use on-primary/primary or on-selected/selected-bg with an additional solid surface halo. Basemap, route strokes, cluster labels and every adjacent-map combination still need rendered checks against the licensed map style. No numeric token table can certify arbitrary map imagery. Unknown/unresolved places do not receive invented map pins.

### 2.1 Contrast evidence

Calculated with `.agents/skills/ui-color-systems/scripts/check-contrast.mjs`, importing its `checkPair` function through Node. Each theme checks nine foreground roles (`text-primary`, `text-secondary`, `text-muted`, `primary`, `accent`, and the four status foregrounds) against canvas/surface/elevated; control and focus against those three surfaces; three primary on-color states; three accent on-color states; four status pairs; and on-selected/selected-bg. That is **44 pairs per theme, 88 total, zero failures**.

| Pair | Light ratio | Dark ratio | Threshold |
| --- | --- | --- | --- |
| Primary text / canvas | 13.217:1 | 15.767:1 | 4.5:1 |
| Muted text / surface | 5.740:1 | 7.122:1 | 4.5:1 |
| On-primary / primary | 8.228:1 | 9.333:1 | 4.5:1 |
| Control border / canvas | 3.317:1 | 5.823:1 | 3:1 |
| Control border / elevated | 3.471:1 | 4.451:1 | 3:1 |
| Focus / canvas | 5.490:1 | 9.971:1 | 3:1 |
| Warning foreground / warning background | 6.601:1 | 7.823:1 | 4.5:1 |
| Error foreground / error background | 6.211:1 | 7.871:1 | 4.5:1 |
| On-selected / selected background | 7.928:1 | 8.286:1 | 4.5:1 |

Comparisons use unrounded values; displayed ratios are rounded. Lowest text ratio across the declared set: 5.265 light and 6.053 dark. Disabled/decorative pairs, alpha overlays, maps/images, text rendering and forced colors are outside this calculation. Readable disabled states remain a product goal even where contrast exceptions apply.

To recheck one pair without installing anything: `node .agents/skills/ui-color-systems/scripts/check-contrast.mjs --pair '#FFFFFF' '#08594F' 4.5`. Recheck every declared combination after a token change; a passing seed palette is not a substitute for testing these custom values. Use [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for applicable contrast requirements and exceptions; the table is not a rendered accessibility certificate.

## 3. Typography and loading

**Public Sans** carries the complete application: controls, itineraries, tables, currencies, source metadata and headings. **Newsreader** carries public editorial headlines and an optional trip-name display on Overview. Do not use the serif for forms, alerts, financial data or compressed rows. No mixed-font word inside a headline just for emphasis; use the same family's weight instead.

Both source repositories identify SIL Open Font licensing; preserve their actual licence files with shipped assets. Verify required weights, shaping and glyph coverage from the chosen font files. Use language-appropriate system fallbacks for place names outside the chosen subsets; do not claim the Latin families cover every script. [Public Sans](https://github.com/uswds/public-sans), [Newsreader](https://github.com/productiontype/Newsreader).

Load through the installed Next.js version's `next/font` or licensed local `@font-face` files with swap/fallback metrics. Preload only actual critical faces; Newsreader need not load on ledger-only routes. Prefer upright Public Sans 400/500/600 and Newsreader 500/600 without unnecessary italic downloads. Verify computed font, licence and loading in the browser. [Next.js font guidance](https://nextjs.org/docs/15/app/getting-started/fonts).

Assuming a 16px root for illustration, preserve user root-size preferences. Use rem-based app roles; optional fluid public titles need separate text-resize checks.

| Role | Mobile size / line height | Desktop size / line height | Family, weight and tracking |
| --- | --- | --- | --- |
| Public display | 2.5rem / 1.12 | 4rem / 1.08 | Newsreader 500, -0.02em; max two lines at ordinary desktop sizes |
| Public section | 2rem / 1.18 | 2.75rem / 1.15 | Newsreader 500, -0.015em |
| App page title | 1.75rem / 1.25 | 2rem / 1.2 | Public Sans 600, -0.015em |
| Trip-name display | 1.75rem / 1.25 | 2.5rem / 1.18 | Newsreader 500; Overview only, natural wrap |
| Section heading | 1.375rem / 1.3 | 1.5rem / 1.3 | Public Sans 600, -0.01em |
| Subsection/card title | 1.125rem / 1.4 | 1.125rem / 1.4 | Public Sans 600, normal tracking |
| Lead | 1.125rem / 1.55 | 1.25rem / 1.5 | Public Sans 400 |
| Body | 1rem / 1.55 | 1rem / 1.55 | Public Sans 400 |
| Supporting/source | 0.875rem / 1.5 | 0.875rem / 1.5 | Public Sans 400; essential provenance never smaller |
| Field/control label | 0.875rem / 1.45 | 0.875rem / 1.45 | Public Sans 500; input values 1rem |
| Button | 1rem / 1.4 | 0.875rem / 1.45 | Public Sans 600; allow wrapping under zoom/localisation |
| Caption/eyebrow | 0.75rem / 1.5 | 0.75rem / 1.5 | Public Sans 500; optional public categorisation only |

Amounts and aligned times use `font-variant-numeric: tabular-nums`; body prose does not need tabular figures. Use explicit ISO currency where symbols could be ambiguous, full amount/currency in accessible names and clear negative/refund meaning. Avoid fixed-height text boxes. Long prose starts around 65ch; forms and explanatory status messages keep a comfortable measure. Preserve meaningful titles instead of essential ellipses; long unbroken URLs can wrap.

Verify 80-character trip names, native-script place names, missing glyphs, 200% text resizing, 320px reflow and WCAG text-spacing overrides: 1.5 line-height, paragraph spacing twice font size, 0.12em letter spacing and 0.16em word spacing. No clipped labels, hidden actions or lost source details.

## 4. Spacing, layout, shape and layers

| System | Canonical values / rules |
| --- | --- |
| Spacing | 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96px, expressed in rem. 2px is optical/detail spacing; 8/12/16 for within groups, 24/32 for groups, 64/96 for public sections |
| Gutters | 16px below 640px; 24px at 640-1023px; 32px from 1024px. Respect mobile safe-area insets for fixed action bars |
| Containers | Prose 65ch; forms 48rem; public content 80rem; trip/dashboard 100rem maximum. Workspace is fluid within available width, not all maxima nested |
| Global shell | Desktop sidebar 208px; collapse below 1200px. Header minimum 56px, may grow with text; no fixed text clipping |
| Workspace | Split list/map only from 1024px when both usable widths fit; starting 55/45 ratio, map minimum 360px. Narrower views switch explicitly |
| Grid | Flexible CSS Grid tracks with `min-width: 0`; content-first breakpoints at 640/1024/1200px, with 768px and short-height conditions tested |
| Controls | Frequent targets minimum 44x44px; primary mobile form actions min-height 48px. Padding may grow for wrapped labels; visual icons may be smaller than hit areas |
| Rows | Itinerary min-height 88px plus content; ledger min-height 56px desktop, auto-height labelled records mobile; no hard height that clips |
| Radii | 0 for structural edges, 6px controls, 10px meaningful panels/popovers, 16px editorial image crops, full radius only avatars/number markers |
| Elevation 0 | Resting lists, photos, standard panels: no shadow |
| Elevation 1 | Dropdown/inspector: light `0 4px 16px rgba(21,46,43,0.10)`; dark `0 4px 16px rgba(0,0,0,0.24)` plus subtle edge |
| Elevation 2 | Modal/sheet: light `0 16px 48px rgba(21,46,43,0.18)`; dark `0 16px 48px rgba(0,0,0,0.40)` plus control/surface edge where needed |
| Scrim | Light `rgba(16,28,25,0.48)`, dark `rgba(0,0,0,0.64)` as starting choices. Keep foreground opaque and verify actual composition; no text sits directly on scrim |
| Layers | Base 0; sticky 100; dropdown 200; nonmodal inspector 250; modal backdrop/surface 300/400; transient notification 500. Native top layer and stacking contexts still govern |

Focus recipe: a 2px surface-colored separator plus 2px focus-colored outer outline, with enough layout clearance. The separator isolates the indicator from filled controls. Test actual adjacent surfaces and clipping; on images/maps, use an opaque control surface. Forced-colors uses system Highlight/CanvasText and preserves native outline visibility. The entire focused control should remain visible as a product goal; do not misstate enhanced focus visibility as the minimum AA criterion.

One page scroller is the default. Mobile never requires dragging a sheet to reveal essential content. Sticky bars include content padding and scroll padding so the last row and focused control are not covered. At 200% text/short landscape, simplify or release sticky chrome instead of squeezing the content. Browser history, anchors and native scrolling must work.

## 5. Iconography and imagery

Lucide icons: 16px inline metadata, 20px controls, 24px major mobile actions, consistent 1.75px stroke as the starting optical rule. Decorative icons beside text are hidden from assistive technology. An icon-only button has a specific accessible name such as “Move Mysuru Palace” or “Open trip settings”, not “More icon”. Selected/expanded/pressed state is exposed semantically. Never use a sparkle icon to imply factual verification.

Waypoint markers contain a real sequence number, a selected outline and adequate on-color contrast. Route stroke identity also uses labels/line treatment when multiple routes are shown. Do not depend on red/green differences alone. Completion uses text plus a check; unknown has the word Unknown, not an unexplained dash.

Use real, licensed documentary destination/place photography selected for recognition, geographic accuracy and useful human scale. Keep natural light and restrained grading; avoid generic luggage/airplane collages. Hero crops start near 16:9, destination spreads 3:2, small place thumbnails 4:3. Reserve dimensions and supply responsive sources. No text/evidence/price over an uncontrolled photo background. Credits are real attribution when required, not decorative fictional captions.

No licensed editorial photographs have been selected for this direction. The former 3D experiment was removed in full at the owner's request. Acquire the two real photographs specified in UI_UX_PLAN.md section 3.6, with documented rights, location, credit and crops before public visual acceptance. Use a neutral reserved slot and meaningful title during development. Do not generate a substitute destination photograph. Marketing demonstrations remain labelled illustrative; selected delivery assets live under `public/images/editorial/` with provenance in `src/content/marketing/media.ts`.

## 6. Reusable component contracts

Components consume authorised domain data and semantic tokens. Do not put money calculations, provider truth or permission authority into display components. Start with native HTML; choose one tested accessible primitive foundation for the few complex widgets during implementation, then style it to this contract. Do not add multiple complete component systems.

| Component | Anatomy, behaviour and states |
| --- | --- |
| Button / link | Native button for actions, link for navigation; primary/secondary/ghost/destructive; visible focus, pending label, semantic disabled, no hit-area movement |
| Field | Visible label, input, optional hint, inline error linked by description; preserve typed value; `aria-invalid` after meaningful validation; linked error summary on failed multi-field submit |
| Place combobox | Labelled text input, listbox suggestions, locality/country, source; loading/no-results/provider-error independent from typed text; correct arrows/Enter/Escape and stale-request handling |
| Date/currency/count controls | Simple labelled native fields/selects first; optional calendar has complete keyboard/focus behaviour; no fabricated provider limits |
| Trip navigation | Named links/current page; global context replaced by trip context on mobile; More sheet contains route links, not action-menu semantics |
| Trip summary | Title link, destination, dates, lifecycle, next action and genuine check count; static media is not an interactive card; secondary actions do not nest in title link |
| Day selector | Labelled native select plus optional visible day list, including Unscheduled when populated; selected date/location remain explicit; no horizontal chip-only access to distant days |
| Activity row | Planned time, waypoint, title/duration, critical missing check, Details/Move/More; stable ID; selected/completed/manual states separate |
| Route leg | From/to, mode, provider/calculation provenance, duration/distance if available, retrieval and freshness; needs-refresh/unavailable are visible without deleting activities |
| Map + list | Same selected day/activity IDs, numbered markers, named zoom/fit/locate controls, attribution, list equivalent; unresolved items remain list-only |
| Activity editor | Inspector or full-screen sheet, labelled fields, explicit Save/Cancel, dirty/save/error/conflict states; retain input and safe return focus |
| Structural-change review | Old/new date/destination mapping, affected content and explicit shift/remap/Keep unscheduled choices; preserve original notes/links and financial/external dates; atomic revision-aware apply |
| Move dialog | Current item/day/position, destination day/position preview, Move/Cancel; no drag requirement; final placement announcement and focus restoration |
| Proposal review | Scope/base revision, current/proposed operations, reason/source gaps, selection and explicit Apply/Discard; overlapping manual edits opt-in; stale-base conflict review |
| Price evidence | One of six full text labels plus details action; independent freshness and payment; unknown amount remains absent; no single Verified badge |
| Price details | Original amount/range, unit/quantities, source/check/validity, fees/exclusions, calculation inputs/FX. Essential provenance is at least 14px and not tooltip-only |
| Budget ledger | Semantic table on desktop, labelled records on narrow screens; group basis, known subtotal/unknown coverage and Plan/Actuals; tabular amounts and no duplicate commitments |
| Expense form | Amount/currency/date/category/payer, personal/shared scope, participant shares, rounding/reconciliation, linked obligation; pending/error/ambiguous-result recovery; no optimistic payment claim |
| Booking record | External provider/reference, recorded status and source, payment separately, attached document permissions; no confirmation inferred from provider-page navigation |
| Readiness list | Named unresolved/optional checks and scoped fix links; no universal score that implies safety, availability or complete costs |
| Save/offline status | Editing/Saving/Synced/Failed; snapshot availability/time independent. Saved locally/Pending sync/Conflicting only for supported durable later mutations |
| Source/alert record | Category, issuer/source, geography/affected segment, event/fetched/validity, freshness and source action; news and official advisories separate |
| Dialog/sheet | Native/tested modal semantics, title, focus entry/trap/return, inert background, Escape/visible close, dirty-state retention; Motion owns only visual child/backdrop |
| Disclosure/tooltip | Native details or heading/button for disclosure; tooltip supplemental, hover/focus and Escape; essential/touch instructions remain visible elsewhere |
| Empty/loading/error | Distinct first-use/no-matches/complete/access/not-ready; static skeleton with busy state; persistent actionable failure and preserved data |
| Toast/status | Polite confirmation without forced focus; critical failures remain inline. Undo has persistent history access, not only a timed toast |
| Packing/vault/group | Later phase only: native checkboxes, explicit audience/online-offline copy labels, actual capabilities and member history; privacy before presence |
| Companion | Contextual later route/panel, source-aware answer, same proposal review for mutations; no unsourced live facts or silent edits |

Tabs change in-page panels with full tab semantics and manual activation when loading is slow; route links remain links. Actions use menu-button semantics only for actual action menus. A future search/command palette is optional; visible navigation and touch controls always remain. Public footer has ordinary grouped links, no operational status decoration or invented partner logos.

## 7. Motion contract

The full ownership/trigger/interruption matrix is [UI_UX_PLAN.md, section 9](UI_UX_PLAN.md#9-motion-and-animation-ownership). This is the canonical summary:

| Role | Timing/ease | Owner |
| --- | --- | --- |
| Logical state/focus/keyboard selection | Immediate | Browser/React state, no decorative delay |
| Button/border feedback | 120ms, `cubic-bezier(0.2,0,0,1)` | CSS, no `transition: all` |
| Small status fade | <=160ms standard | CSS; actual data acknowledgement only |
| Successful reorder continuity | 180ms standard | Motion `layout="position"` on non-dragged row wrapper |
| Modal/sheet visual surface | 220ms enter / 160ms exit, <=12px translate | Motion; modal primitive owns semantics/focus |
| Map camera | <=200ms explicit fit/locate/selection | Map API; user pan interrupts |
| Public detour example | Explicit Before / Preview / After; optional <=160ms highlight and <=8px translate after input | HTML state + CSS; no GSAP, timed reading or automatic advance |

Reduced motion removes spatial/layout movement and makes camera jumps immediate. Any retained opacity transition is <=80ms and optional. No autoplay, ambient loops, bounce, parallax, scrolling replacement or animation on every card. Native scroll remains untouched.

One property has one animation owner. Motion may own a dialog's visual child, CSS its inner button fill, and the modal primitive its focus state; none targets the other's property. Drag preview and row-layout transforms use separate wrappers. Public CSS does not target Motion descendants. Cleanup removes listeners/observers and cancels stale asynchronous work on unmount/update. Respect current preference changes, not only initial load.

API families were checked in official documentation; this is not a locked package manifest. Use the installed release's `motion/react` API, `AnimatePresence`, `MotionConfig`/`useReducedMotion` and `layout` deliberately. The public example uses HTML/CSS and needs no GSAP or additional motion library. [Motion](https://motion.dev/docs/react).

## 8. Content, privacy and trust language

Use direct action labels: Plan a trip, Start manually, Review proposal, Apply selected changes, Add expense, Open provider, Download offline copy. Explain what actually saved. Avoid “Your perfect trip is ready”, “AI verified”, “Roads clear”, “Guaranteed price”, “Payment sent” or “Synced” before the corresponding evidence exists.

All demo records are labelled Illustrative trip or fixture data. Personal budget targets and allowances are `user_entered`; arithmetic derived from them is `calculated_estimate`. A source badge always refers to a specific record, never to the whole trip. Missing supplier amount is Unknown, not zero. Source, check time, expiry, currency and quantity basis remain legible.

Do not expose document titles, booking references, home location, mobility notes or private member information through previews, notifications, logs or AI context without permission. Documents default to uploader-private; sharing and offline storage are explicit. A role/capability can enable a control only when backend policy agrees. Offline copies show saved time and platform limitations; revocation cannot promise erasure of exported files.

Errors identify the failed action and useful recovery while preserving entered data. “Changes not saved. Retry” is better than a vague failure toast. Unknown coverage must remain visible near cost/operational decisions. No safety disclaimer wall is a substitute for current official-source handling and honest unavailable states.

Planning drafts may contain missing destination/date/party fields and still save/resume. Generation and dated manual planning use a separate validated input contract. Changing an existing trip's date/destination structure requires a reviewed mapping; displaced activities and day notes remain in a visible Unscheduled section, with stable identity and record links. Do not silently shift booking dates, actual expenses or payments to match a new plan.

## 9. Verification and change discipline

Completed for this document task: repository and instruction inspection, external primary-source desk research, three direction comparison, written wireframes/state specifications, critique and opaque token arithmetic. No rendered screenshots, keyboard/AT results, browser usability test, performance audit or production accessibility conformance is claimed.

Before shipping, verify actual component states at 320/375/390/768/1024/1366/1440px as relevant, 200% text separately, text spacing, long/native-script content, light/dark, reduced motion and forced colors. Test keyboard, modal focus, no-drag ordering, map/list equivalence, OTP paste/autofill, retained errors, partial/stale/offline/permission states and all domain invariants. Record real device/browser/AT versions and performance conditions. The detailed acceptance criteria live in the companion plan.

Future changes to this contract should be scoped: identify affected roles/components/routes, explain the user need, recheck color pairs and adjacent states, and preserve unrelated decisions. Resolve conflicting instructions in favour of product truth, accessible operation and the user's brief. This proposal does not authorise application implementation, installation, deployment, migration or replacement of existing project documents.

---

## 10. v3.2 Brand Assets, Glassmorphism & Motion Architecture

### 10.1 Pure Image-Logo Brand Architecture
WanderWay enforces a strict **Pure Image-Logo** policy across all navigation rails, footers, headers, and authentication forms. Brand names must never be rendered as standalone plain text `<span>WanderWay</span>` in place of the official brand marks:
- **Horizontal Navigation Wordmark (`/nav_logo.png`)**: Dimension 1063 × 347. Used in the persistent desktop sidebar (`stitch-sidebar.tsx`), global top navigation header (`stitch-home-launcher.tsx`), footer anchors, and authentication screens (`login-form.tsx`).
- **Primary Brand Crest (`/logo.png`)**: Dimension 1254 × 1254. Used for primary brand moments, large modal headers, and standalone brand splashes.
- **App Icon & Companion Avatar (`/favicon.png`)**: Dimension 535 × 535. Used in browser tabs, metadata icons, and the WanderWay AI Companion widget.

### 10.2 Multi-Layer Glassmorphism System
Any floating container, badge, pill, or control that overlays background photography must implement true frosted glassmorphism rather than flat opaque fills:
- **Blur Recipe:** `backdrop-blur-xl` or `backdrop-blur-2xl`.
- **Translucent Tonal Fill:** `bg-white/80 dark:bg-stone-900/80` (or `bg-black/50` on dark scrims).
- **Subtle Light Borders:** `border border-white/40 dark:border-white/15`.
- **Soft Shadows & Focus Rings:** `shadow-xl ring-1 ring-black/5`.
- **Applied Surfaces:**
  - Home Launcher Quick Trip Planner floating bar
  - Hero Pill Badges & Trust Highlight chips
  - Trending Journeys route badges and duration pills
  - Explore Hub destination rank badges
  - Active Trip Hero countdown indicators and action buttons
  - Alpine Vista Auth Form card and telemetry chips

### 10.3 Dual-Engine Animation Architecture
- **GSAP 3 (`@gsap/react`)**: Owns complex multi-element hero choreography, numeric counter interpolations, and radial progress gauges (`useGSAP`).
- **Motion v12 (`motion/react`)**: Owns state transitions, spring tactile buttons (`whileHover`, `whileTap`), sliding indicator pills (`layoutId`), and drawer entry/exit animations (`AnimatePresence`).
- **Accessibility:** Governed by `useReducedMotion()`, suppressing layout translation and scaling whenever reduced motion is detected.
