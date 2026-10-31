// node --test test/
// Safari can read extension scripts as Windows-1252 ("Settings…" showed as "Settingsâ€¦"),
// so shipped files stay ASCII; use \u escapes or HTML entities instead.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const dirs = [`${__dirname}/../Extension/Resources`, `${__dirname}/../Chrome`];

test('extension files are ASCII only', () => {
  for (const dir of dirs) {
    for (const name of fs.readdirSync(dir, { recursive: true }).filter((n) => /\.(js|html|json|css)$/.test(n))) {
      fs.readFileSync(`${dir}/${name}`, 'utf8').split('\n').forEach((line, i) => {
        assert.ok(!/[^\x00-\x7F]/.test(line), `${name}:${i + 1}: ${line.trim()}`);
      });
    }
  }
});
