# UI color systems

## Workflow

1. Inspect existing tokens and the requested brand/theme. Preserve established semantics.
2. Select a suitable seed or existing palette. Use neutral foundations and a clear action hierarchy when the brief is open; multiple brand or data hues can be appropriate.
3. Define primitives, semantic roles, and component aliases where useful. A small system need not implement three duplicate alias layers.
4. Define explicit foreground/background pairs and every supported interaction state.
5. Measure pairs on each rendered surface and theme, including elevated surfaces, errors, selected rows, hover/active fills, and focus adjacency.
6. Report measured pairs, failures, changes, and any untested transparency/wide-gamut combinations.

## Semantic roles

The 14 source roles are primary, secondary, accent, background, surface, surface-elevated, text-primary, text-secondary, text-muted, border, success, warning, error, and info.

These are not enough alone: also define on-primary, on-accent, primary-hover/active, accent-hover/active, focus, control-border, disabled-bg/text, and status background/foreground pairs as needed. A pale decorative border is not a valid sole affordance for an otherwise invisible input.

## Four seed palettes

Read assets/palettes.json when selecting colors. It retains all four source palettes and both modes as opaque sRGB hex values. The checker verifies declared text roles across canvas/surface/elevated surface, solid-button foregrounds in all supplied states, control-border adjacency, and focus adjacency. It exits nonzero on failure and reports raw ratios without rounding for the decision.

| Palette | Starting use |
| --- | --- |
| slate-cobalt | Neutral application chrome, ink CTA, cobalt links. |
| warm-terracotta | Editorial, hospitality, knowledge, consumer workflows. |
| obsidian-indigo | Dense technical workflows; indigo action and sky links. |
| navy-emerald | Transactional and administrative interfaces. |

These are seeds, not a universal brand prescription. HEX is the canonical value in the bundled data; the report's manually supplied OKLCH coordinates and contrast tables are deliberately replaced by calculated checks. Recompute after customization. No numeric price or reservation evidence is implied by a visual palette.

## Measurement rules

Normal text requires 4.5:1 under WCAG 1.4.3. Large text uses 3:1: at least 18pt (24 CSS px), or 14pt bold (approximately 18.67 CSS px). Evaluate the rendered weight and size. Inactive components, incidental decoration, and logotypes have specified exceptions; do not falsely fail them, though readable disabled controls remain a good goal.

Information needed to identify controls, states, and meaningful graphics requires 3:1 against relevant adjacent colors under 1.4.11, with exceptions. Decorative card dividers do not all need 3:1. A visible, sufficiently contrasting label can identify some borderless buttons; an empty input often needs a discernible boundary.

Use the WCAG sRGB relative-luminance formula for opaque sRGB values. Composite alpha layers onto the actual background before measurement; account for changing image backgrounds. Wide-gamut colors need a suitable color-managed workflow. The included checker intentionally rejects alpha, named colors, malformed HEX, and unsupported formats.

APCA may supplement analysis but is not WCAG 2.2 AA's contrast algorithm. Do not infer a pass from a ramp step difference, equal OKLCH L, or a claimed brand ratio.

## Scale and theme construction

Use OKLCH for perceptual editing; validate gamut, clipping, and contrast after conversion. Chroma has no single fixed universal maximum; displayable limits depend on hue, lightness, and gamut. Equal L does not mean identical WCAG luminance or exact hue stability.

Radix's 12-step roles are helpful: 1-2 backgrounds, 3-5 component states, 6-8 borders, 9-10 solid fills, 11-12 text. Its APCA guarantees are scoped to the same scale and documented pair; arbitrary mixes have no guarantee. Choose on-color by measurement, especially yellow/amber/lime fills.

Build dark mode as semantic remapping, not inversion. Distinguish canvas, panel, floating surface, and overlay using appropriate luminance, borders, and shadows. No fixed percentage jump or shadow prohibition is required. Test off-white and pure-white ink in context; halation is not an absolute ban on white.

Communicate statuses with text, icons, shape, or patterns as well as hue. For charts, verify distinguishability and provide accessible values. Test forced-colors/high-contrast mode; preserve native affordances or provide system-color fallbacks.

## Sources

- [Contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [Radix scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [CSS Color 4](https://www.w3.org/TR/css-color-4/)

