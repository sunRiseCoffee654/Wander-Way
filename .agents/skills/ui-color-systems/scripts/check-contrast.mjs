import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function luminance(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new Error('Expected opaque six-digit sRGB HEX, received ' + String(hex));
  }
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function checkPair(foreground, background, minimum = 4.5) {
  if (!Number.isFinite(minimum) || minimum < 1 || minimum > 21) {
    throw new Error('Contrast threshold must be between 1 and 21');
  }
  const ratio = contrast(foreground, background);
  return { foreground, background, minimum, ratio, pass: ratio >= minimum };
}

const surfaces = ['background', 'surface', 'surface-elevated'];
const textRoles = ['text-primary', 'text-secondary', 'text-muted', 'accent', 'success', 'warning', 'error', 'info'];
const required = ['primary', 'secondary', 'accent', ...surfaces, ...textRoles,
  'border', 'on-primary', 'on-accent', 'primary-hover', 'primary-active',
  'accent-hover', 'accent-active', 'focus', 'control-border', 'disabled-bg', 'disabled-text'];

export function audit(data) {
  if (!Array.isArray(data.palettes) || data.palettes.length === 0) {
    throw new Error('Expected at least one palette');
  }
  const results = [];
  const ids = new Set();
  for (const palette of data.palettes) {
    if (typeof palette.id !== 'string' || !palette.id || ids.has(palette.id)) {
      throw new Error('Palette IDs must be unique nonempty strings');
    }
    ids.add(palette.id);
    for (const mode of ['light', 'dark']) {
      const tokens = palette.modes?.[mode];
      if (!tokens) throw new Error('Missing ' + palette.id + '/' + mode);
      for (const role of required) luminance(tokens[role]);
      const add = (fg, bg, minimum) => results.push({
        palette: palette.id, mode, foregroundRole: fg, backgroundRole: bg,
        ...checkPair(tokens[fg], tokens[bg], minimum)
      });
      for (const surface of surfaces) {
        for (const role of textRoles) add(role, surface, 4.5);
        add('control-border', surface, 3);
        add('focus', surface, 3);
      }
      for (const role of ['primary', 'primary-hover', 'primary-active']) add('on-primary', role, 4.5);
      for (const role of ['accent', 'accent-hover', 'accent-active']) add('on-accent', role, 4.5);
    }
  }
  return results;
}

function main(args) {
  if (args[0] === '--pair') {
    if (args.length !== 3 && args.length !== 4) throw new Error('Usage: --pair FOREGROUND BACKGROUND [MINIMUM]');
    const result = checkPair(args[1], args[2], args.length === 4 ? Number(args[3]) : 4.5);
    console.log(JSON.stringify(result, null, 2));
    return result.pass ? 0 : 1;
  }
  if (args.length > 1) throw new Error('Usage: check-contrast.mjs [PALETTES.json]');
  const path = args[0] || new URL('../assets/palettes.json', import.meta.url);
  const results = audit(JSON.parse(readFileSync(path, 'utf8')));
  const failures = results.filter(result => !result.pass);
  console.log(JSON.stringify({
    checkedPairs: results.length, failures,
    scope: 'Opaque sRGB declared pairs only; excludes alpha, images, forced colors, disabled/decorative exemptions, and rendered-page certification.'
  }, null, 2));
  return failures.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}

