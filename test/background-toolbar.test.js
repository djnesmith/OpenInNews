// node --test test/
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./fake-browser.js');
const ARTICLE = 'https://www.wsj.com/politics/some-long-article-slug-here';
const found = async () => 'A1';

test('auto-open on: the popup stays', async () => {
  const b = load(found);
  await b.visit(1, ARTICLE);
  assert.strictEqual(b.popups[1], 'popup.html');
});

test('auto-open off globally or for the site: a click opens the article', async () => {
  for (const [action, fields] of [['setAuto', { on: false }], ['setSiteAuto', { site: 'wsj.com', on: false }]]) {
    const b = load(found);
    await b.message({ action, ...fields });
    await b.visit(1, ARTICLE);
    assert.strictEqual(b.popups[1], '', action);
    assert.strictEqual(await b.click(1), null, action);
    assert.strictEqual(b.navigated[1], 'applenewss:///A1', action);
  }
});

test('miss, failed lookup, non-article page: the popup stays', async () => {
  for (const [resolve, url] of [[async () => null, ARTICLE], [async () => { throw new Error('503'); }, ARTICLE], [found, 'https://www.wsj.com/news/world']]) {
    const b = load(resolve);
    await b.message({ action: 'setAuto', on: false });
    await b.visit(1, url);
    assert.strictEqual(b.popups[1], 'popup.html', url);
  }
});

test('a new page brings the popup back', async () => {
  const b = load(found);
  await b.message({ action: 'setAuto', on: false });
  await b.visit(1, ARTICLE);
  await b.navigate(1, 'https://www.wsj.com/news/world');
  assert.strictEqual(b.popups[1], 'popup.html');
});

test('no one-click if the tab moved on before the lookup finished', async () => {
  const b = load(found);
  await b.message({ action: 'setAuto', on: false });
  await b.visit(1, ARTICLE, { tabUrl: 'https://www.wsj.com/news/world' });
  assert.strictEqual(b.popups[1], 'popup.html');
});

test('Option-click shows the settings and keeps one-click', async () => {
  const b = load(found);
  await b.message({ action: 'setAuto', on: false });
  await b.visit(1, ARTICLE);
  await b.click(1, ['Alt']);
  assert.strictEqual(b.popupsOpened(), 1);
  assert.strictEqual(b.navigated[1], undefined);
  assert.strictEqual(b.popups[1], '');
});

test('Option-click where the popup cannot open: the next click shows the settings', async () => {
  const b = load(found, { openPopup: async () => { throw new Error('unsupported'); } });
  await b.message({ action: 'setAuto', on: false });
  await b.visit(1, ARTICLE);
  assert.match(String(await b.click(1, ['Alt'])), /unsupported/);
  assert.strictEqual(b.popups[1], 'popup.html');
});

test('a click when the article cannot be found now shows the settings', async () => {
  let calls = 0;
  const b = load(async () => (calls++ === 0 ? 'A1' : undefined));
  await b.message({ action: 'setAuto', on: false });
  await b.visit(1, ARTICLE);
  // An in-page navigation the content script didn't see; the popup stays removed.
  await b.navigate(1, 'https://www.wsj.com/politics/another-long-article-slug-here');
  b.popups[1] = '';
  assert.strictEqual(await b.click(1), null);
  assert.strictEqual(b.popups[1], 'popup.html');
  assert.strictEqual(b.popupsOpened(), 1);
  assert.strictEqual(b.navigated[1], undefined);
});
