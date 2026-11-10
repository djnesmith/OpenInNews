// node --test test/
const test = require('node:test');
const assert = require('node:assert');
const { iconFor } = require('../Extension/Resources/icon.js');
const fs = require('node:fs');
const manifest = require('../Extension/Resources/manifest.json');

test('gray with a tooltip when the article is not in News', () => {
  const icon = iconFor(null, manifest);
  assert.strictEqual(icon.title, 'Not in Apple News');
  for (const [size, file] of Object.entries(icon.path)) {
    assert.match(file, new RegExp(`gray-${size}`));
    assert.ok(fs.existsSync(`${__dirname}/../Extension/Resources/${file}`), file);
  }
});

test('normal icon when the article is found', () => {
  assert.deepStrictEqual(iconFor('AbC123', manifest), { path: manifest.action.default_icon, title: 'Auto Open in News' });
});

test('normal icon for undefined: lookup failed or never ran', () => {
  assert.deepStrictEqual(iconFor(undefined, manifest), iconFor('AbC123', manifest));
});
