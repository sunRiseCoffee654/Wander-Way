# Component and page guidelines

## Foundations

Reuse the project scale; if absent, start with 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 120, 160 CSS pixels expressed in rem for scalable spacing. Give each token one value; the source's 40-48px range is a choice between tokens, not one ambiguous token. Optical exceptions and fluid spacing are valid.

Typical control/card radii are 6-8px and 8-12px; deliberate brand geometry takes precedence. Use open groups and dividers where cards add no meaning. Space within groups more tightly than between groups.

Use flexible content tracks, min-width: 0, intrinsic sizing, logical properties, and appropriate word breaking. Container widths can start near 65ch prose, 48-60rem forms/settings, 75-80rem marketing, and fluid workspaces. Avoid applying every maximum at once. Grid breakpoints follow content; Carbon's 672/1056/1312/1584px are examples, not requirements.

Choose one layer scale, for example base 0, sticky 100, dropdown 200, overlay 300, modal 400, notification 500. Do not redefine the same token to 0, 1, and 2 as the report did. Stacking contexts and native top-layer dialogs matter more than a large number. A dropdown inside a dialog may need to be portaled into the dialog rather than the document body.

Keep elevation and z-index distinct. A resting card does not need a positive z-index. Use borders/surface changes and optional shadows appropriate to each theme.

## Shared component contract

Specify purpose, anatomy, token roles, content sizing, accessible name, applicable states, keyboard behavior, responsive adaptation, and asynchronous failures. Static elements need no artificial hover or disabled states. Prefer native HTML or the project's tested primitives before custom ARIA widgets. APG examples require adaptation and assistive-technology testing.

Target size: default to at least 24x24 CSS pixels for pointer targets under WCAG 2.5.8, respecting its spacing/equivalent/inline/user-agent/essential exceptions. Prefer 44x44 for frequent touch targets. Do not shrink destructive targets to discourage clicking; separate them spatially and label consequences.

Focus: preserve visible focus, logical order, and unobscured interaction. A 2px outline with adequate contrast is a useful recipe, not the only valid indicator. Test sticky chrome, nested scrollers, and forced-colors mode.

## Eighteen component specifications

| Component | Implementation and verification |
| --- | --- |
| 1. Buttons | Native button with explicit type; link for navigation. Primary/secondary/ghost/destructive variants with measured on-color pairs. Label icon-only actions. Use aria-pressed only for toggles. Pending state prevents duplicate submission and announces progress. Disabled states block activation semantically as well as visually. |
| 2. Cards | A cohesive concept with suitable heading level and concise metadata. Static cards stay static. Interactive cards use a real title link or action; stretched links must not cover secondary controls or prevent text selection. Avoid nested interactive elements. |
| 3. Top navigation | Named nav landmark, recognizable brand/home link, aria-current for current page, skip link to main content, responsive disclosure. Do not use menu roles for ordinary site navigation. Translucency is optional and needs contrast testing. |
| 4. Sidebars | Named nav inside an appropriate aside; grouped links and labeled collapse buttons. Preserve active state and discoverability in icon-rail mode. Off-canvas behavior traps focus only when modal, closes predictably, and restores focus. |
| 5. Page/section headers | Heading hierarchy follows document structure. Keep related actions adjacent and adapt to wrapped/localized titles. Sticky filters must not obscure focused items. |
| 6. Footers | Footer landmark with meaningful link groups; use site maps only where useful. Test target spacing and column wrapping. Status indicators need text as well as color. |
| 7. Inputs/forms | Visible associated labels, correct types, autocomplete where useful, descriptions/errors linked via aria-describedby, aria-invalid after validation. Validate on blur/submit when helpful; avoid errors before meaningful input, and recheck corrected errors promptly. Never wipe entries on failure. Do not announce success before the server confirms. |
| 8. Selects/dropdowns/comboboxes | Native select for straightforward value selection; menu button for actions; combobox for selection/suggestions requiring it. They do not share one universal role model. Follow the selected APG pattern for expanded state, popup, focus/active-descendant behavior, arrows, Enter, Escape, and text editing. Handle focus through a dialog popup differently from a listbox. |
| 9. Tabs/segments | Tabs change panels with tablist/tab/tabpanel relationships, aria-selected, and roving tabindex; manual activation for slow panels. Arrow orientation matches layout. A single-choice filter may instead be a radio group; route navigation remains links. |
| 10. Accordions | Native details/summary or heading-wrapped button with aria-expanded and controlled panel. Collapsed content leaves tab order. Enter/Space activate buttons; optional arrow behavior must be consistent. Avoid unnecessary region proliferation. |
| 11. Dialogs/sheets | Native dialog.showModal() or tested modal primitive; accessible title, meaningful initial focus, inert background, Escape and visible dismiss, safe focus return. Focus the least destructive choice where appropriate. Test scroll lock separately; showModal does not guarantee the desired body scroll policy. Do not claim perfect behavior on every browser without testing. |
| 12. Tooltips | Supplemental noninteractive description, hover and keyboard trigger, dismissible with Escape, hoverable and persistent as required. Keep necessary instructions visible elsewhere. Interactive content belongs in a popover/dialog. Ensure touch users can reach essential information. |
| 13. Tables | Semantic table with headers/scope and caption where useful; sort button in header and aria-sort on active sorted header. Align numeric data and use tabular numerals. Contain essential horizontal scrolling. Use role=grid only if implementing its full interaction model, not merely to style a table. |
| 14. Empty states | Distinguish first use, no matches, completion, access denied, and not-ready data. Provide the appropriate create/reset/request-access action. Never render an empty result before loading resolves. Explain only known permission facts. |
| 15. Loading states | Immediate acknowledgment of actions; preserve existing content during refresh. Delay intrusive spinners/skeletons when it avoids flicker, but do not hide all feedback for one second. Use aria-busy and concise status announcements. Progress is determinate only when actual progress is measurable; never fabricate a percentage. |
| 16. Error states | Explain what failed and a known recovery action; distinguish validation, network, access, and partial failure. Keep input and successful partial work. Announce urgent failures assertively only when warranted; avoid duplicate live regions. Retry must not silently duplicate purchases or writes. |
| 17. Toasts | Brief confirmation or reversible action supplement, with role=status/polite for routine updates. Critical errors require persistent discoverable treatment. Pause timed dismissal on hover/focus; provide enough time or persistent history, especially for Undo. No forced focus for routine toasts. |
| 18. Search/command palette | Visible label, clear/reset action, useful empty/no-results/loading/error states. Use appropriate combobox/listbox or other tested command semantics. Handle IME composition and stale network results; debounce requests, not typing feedback. Respect platform shortcut conventions and collisions. |

Data views need populated, loading, empty, no-results, and error states where those conditions exist. Async actions also need pending and success/recovery behavior. Do not invent states irrelevant to static content.

## Nine page archetypes

| Route | Starting architecture | Critical checks |
| --- | --- | --- |
| Landing | Clear value proposition, main action, authentic product evidence, task-relevant narrative. | Useful mobile first screen; real claims; no dead demo controls. |
| Authentication | Focused form; SSO/passkeys only when supported. | Password managers, autocomplete, paste, accessible recovery and authentication; single usable OTP input or equivalently robust grouped control. |
| Dashboard | Navigation shell, prioritized status, actionable queue/chart. | Role-appropriate density, first-use state, actual permissions, current data uncertainty. |
| Settings | Grouped sections, secondary navigation if needed, clear save model. | Dirty state, failure recovery, safe defaults, dangerous actions separated. |
| Profile | Identity header, concise metadata, relevant activity/details. | Long/missing names, avatar fallback, privacy and empty activity. |
| Data-heavy | Filter toolbar, table/list, optional inspector, bulk actions. | Scroll/focus context, selection across pagination, partial errors, wide-data containment. |
| Complex form/checkout | Related fields together, optional summary, stages only where helpful. | Server validation, retained input, accurate totals, explicit irreversible actions. |
| Search/marketplace | Search and facets, active filters, result list/grid, optional map. | Result announcements, touch filters, clear-all, no results, image sizing. |
| Content/docs | Readable prose, meaningful navigation, optional TOC. | Anchor focus/offset, narrow-screen navigation, code overflow and copy feedback. |

Use these as adaptations, not compulsory templates. Do not add charts, SSO, autosave, prices, or advanced filters without product support.

## Authoritative behavior references

- [APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [Modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Carbon spacing](https://carbondesignsystem.com/elements/spacing/overview/)

