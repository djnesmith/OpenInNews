// node --test test/
const test = require('node:test');
const assert = require('node:assert');
const { autoOpens } = require('../Extension/Resources/autoopen.js');

const settings = { sites: { 'wsj.com': true, 'wired.com': false }, auto: true, manual: { 'nymag.com': true } };

test('opens on an enabled site when auto is on', () => {
  assert.strictEqual(autoOpens(settings, 'wsj.com'), true);
});

test('not on a site that is off or unknown', () => {
  assert.strictEqual(autoOpens(settings, 'wired.com'), false);
  assert.strictEqual(autoOpens(settings, null), false);
});

test('not when auto is off globally', () => {
  assert.strictEqual(autoOpens({ ...settings, auto: false }, 'wsj.com'), false);
});

test('not on a site set to the button only', () => {
  const s = { ...settings, sites: { ...settings.sites, 'nymag.com': true } };
  assert.strictEqual(autoOpens(s, 'nymag.com'), false);
});
