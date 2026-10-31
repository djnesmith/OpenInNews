// node --test test/
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./fake-browser.js');
const ARTICLE = 'https://www.wsj.com/politics/some-long-article-slug-here';

test('a miss grays the tab with the tooltip', async () => {
  const b = load(async () => null);
  await b.visit(1, ARTICLE);
  assert.deepStrictEqual(b.icons[1], { gray: true, title: 'Not in Apple News' });
});

test('a hit and a failed lookup keep the normal icon', async () => {
  const hit = load(async () => 'A1');
  await hit.visit(1, ARTICLE);
  assert.strictEqual(hit.icons[1].gray, false);
  const failed = load(async () => { throw new Error('HTTP 503'); });
  await failed.visit(1, ARTICLE);
  assert.strictEqual(failed.icons[1].gray, false);
});

test('a new page resets the gray', async () => {
  const b = load(async () => null);
  await b.visit(1, ARTICLE);
  await b.navigate(1, 'https://www.wsj.com/news/world');
  assert.deepStrictEqual(b.icons[1], { gray: false, title: 'Auto Open in News' });
});

test('no gray if the tab moved on; query and fragment changes do not count', async () => {
  const moved = load(async () => null);
  await moved.visit(1, ARTICLE, { tabUrl: 'https://www.wsj.com/news/world' });
  assert.strictEqual(moved.icons[1].gray, false);
  const rewritten = load(async () => null);
  await rewritten.visit(1, ARTICLE, { tabUrl: `${ARTICLE}?mod=hp#top` });
  assert.strictEqual(rewritten.icons[1].gray, true);
});

test('no tab or a closed tab: no icon change, no error', async () => {
  const b = load(async () => null);
  await b.visit(undefined, ARTICLE, { tabUrl: null });
  await b.visit(7, ARTICLE, { tabUrl: null });
  assert.deepStrictEqual(b.icons, {});
});
