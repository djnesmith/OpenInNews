// node --test test/
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./fake-browser.js');
const ARTICLE = 'https://www.wsj.com/politics/some-long-article-slug-here';

/* A lookup that answers from a list, one answer per call; an Error is thrown. */
function answers(...list) {
  const resolve = async () => { const a = list[resolve.calls++]; if (a instanceof Error) throw a; return a; };
  resolve.calls = 0;
  return resolve;
}

test('a failed lookup is tried again on the next visit', async () => {
  const resolve = answers(new Error('HTTP 503'), 'A1');
  const b = load(resolve);
  assert.strictEqual((await b.message({ action: 'lookup', url: ARTICLE })).id, undefined);
  assert.strictEqual((await b.message({ action: 'lookup', url: ARTICLE })).id, 'A1');
  assert.strictEqual(resolve.calls, 2);
});

test('a miss and a hit are kept', async () => {
  for (const first of [null, 'A1']) {
    const resolve = answers(first, 'other');
    const b = load(resolve);
    await b.message({ action: 'lookup', url: ARTICLE });
    await b.message({ action: 'lookup', url: ARTICLE });
    assert.strictEqual(resolve.calls, 1, String(first));
  }
});

test('visits during a lookup share it', async () => {
  const resolve = answers(new Error('HTTP 503'));
  const b = load(resolve);
  await Promise.all([b.message({ action: 'lookup', url: ARTICLE }), b.message({ action: 'lookup', url: ARTICLE })]);
  assert.strictEqual(resolve.calls, 1);
});
