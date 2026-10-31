// node --test test/
const test = require('node:test');
const assert = require('node:assert');
const { settingsEntries, applyEntries } = require('../Extension/Resources/sync.js');

const local = { sites: { 'wsj.com': true }, auto: true, manual: {}, stamps: { 'site:wsj.com': 100 } };

test('entries carry each key with its time, 0 for defaults', () => {
  assert.deepStrictEqual(settingsEntries(local), {
    auto: { value: true, at: 0 },
    'site:wsj.com': { value: true, at: 100 }
  });
});

test('a newer entry wins, an older one is ignored', () => {
  assert.strictEqual(applyEntries(local, { 'site:wsj.com': { value: false, at: 50 } }), null);
  const next = applyEntries(local, { 'site:wsj.com': { value: false, at: 200 }, auto: { value: false, at: 1 } });
  assert.deepStrictEqual(next.sites, { 'wsj.com': false });
  assert.strictEqual(next.auto, false);
  assert.deepStrictEqual(next.stamps, { 'site:wsj.com': 200, auto: 1 });
});

test('keys merge one by one: a site turned on elsewhere keeps ours', () => {
  const next = applyEntries(local, { 'site:wired.com': { value: true, at: 300 } });
  assert.deepStrictEqual(next.sites, { 'wsj.com': true, 'wired.com': true });
});

test('button-only sites merge, including removal', () => {
  const on = applyEntries(local, { 'manual:nymag.com': { value: true, at: 10 } });
  assert.deepStrictEqual(on.manual, { 'nymag.com': true });
  const off = applyEntries(on, { 'manual:nymag.com': { value: false, at: 20 } });
  assert.deepStrictEqual(off.manual, { 'nymag.com': false });
});

test('unknown keys and junk are ignored', () => {
  assert.strictEqual(applyEntries(local, { 'probe.app.mac': { value: true, at: 9 }, auto: null }), null);
  assert.strictEqual(applyEntries(local, undefined), null);
});
