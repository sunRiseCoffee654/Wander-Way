import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { contrast, checkPair, audit } from './check-contrast.mjs';

test('black and white are 21:1 and identical colors 1:1', () => {
  assert.equal(contrast('#000000', '#FFFFFF'), 21);
  assert.equal(contrast('#123456', '#123456'), 1);
  assert.equal(contrast('#abcdef', '#123456'), contrast('#123456', '#abcdef'));
});
test('known sRGB contrast and threshold use raw precision', () => {
  assert.ok(Math.abs(contrast('#777777', '#FFFFFF') - 4.478089453577214) < 1e-10);
  assert.equal(checkPair('#777777', '#FFFFFF').pass, false);
  assert.equal(checkPair('#767676', '#FFFFFF').pass, true);
});
test('unsupported colors and invalid thresholds fail closed', () => {
  for (const color of ['#fff', '#FFFFFF80', 'white', 'oklch(0.5 0.1 90)', '#GGGGGG', null]) {
    assert.throws(() => contrast(color, '#FFFFFF'));
  }
  for (const value of [NaN, Infinity, 0, 22]) {
    assert.throws(() => checkPair('#000000', '#FFFFFF', value));
  }
});
test('all four palettes have complete passing light and dark declarations', () => {
  const data = JSON.parse(readFileSync(new URL('../assets/palettes.json', import.meta.url)));
  assert.equal(data.palettes.length, 4);
  const results = audit(data);
  assert.equal(results.length, 288);
  assert.deepEqual(results.filter(result => !result.pass), []);
});
test('schema omissions and real contrast regressions are detected', () => {
  const data = JSON.parse(readFileSync(new URL('../assets/palettes.json', import.meta.url)));
  data.palettes[0].modes.light['text-primary'] = '#FFFFFF';
  assert.ok(audit(data).some(result => !result.pass));
  delete data.palettes[0].modes.dark.focus;
  assert.throws(() => audit(data));
  assert.throws(() => audit({ palettes: [] }));
});
test('CLI returns distinct pass, contrast failure and invalid-input codes', () => {
  const script = fileURLToPath(new URL('./check-contrast.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  assert.equal(run('--pair', '#000000', '#FFFFFF').status, 0);
  assert.equal(run('--pair', '#777777', '#FFFFFF').status, 1);
  assert.equal(run('--pair', '#fff', '#FFFFFF').status, 2);
});

