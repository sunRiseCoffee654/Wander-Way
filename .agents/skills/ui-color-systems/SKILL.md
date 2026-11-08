---
name: ui-color-systems
description: "Use when creating or auditing semantic UI color tokens, light and dark themes, accessible palettes, or contrast pairings."
---

# UI Color Systems

Read [references/COLOR_SYSTEMS.md](references/COLOR_SYSTEMS.md) before performing this workflow. It contains the corrected specification derived from the supplied Master UI Design Skill Engineering report.

Honor the user's brief and existing product system. Treat visual defaults as adaptable preferences. Apply accessibility criteria with their actual scope and exceptions. Use current official documentation for version-sensitive APIs; distinguish observed patterns from verified requirements.

The bundled assets/palettes.json contains four seed palettes in light and dark modes. Run node scripts/check-contrast.mjs to audit all declared text, control, and focus pairs. Run node scripts/check-contrast.mjs --pair '#71717A' '#FAFAFA' 4.5 for a single opaque sRGB pair.
A successful seed audit is not a rendered-page accessibility certificate.

Report what was produced, the decisions that matter, evidence from checks, and any remaining limitations. Never claim a live browser check or standards conformance from source inspection alone.

