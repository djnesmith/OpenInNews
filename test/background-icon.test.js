// node --test test/
// Runs the real background.js against a fake browser, with the lookup stubbed.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const R = `${__dirname}/../Extension/Resources/`;
const ARTICLE = 'https://www.wsj.com/politics/some-long-article-slug-here';

function load(owlResolve) {
  const tabs = {}, icons = {}, store = {};
  let onMessage, onUpdated;
  const browser = {
    runtime: {
      getURL: () => 'chrome-extension://x/',
      getManifest: () => JSON.parse(fs.readFileSync(R + 'manifest.json', 'utf8')),
      onMessage: { addListener: (f) => { onMessage = f; } }
    },
    storage: { local: { get: async (keys) => Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, store[k]])), set: async (o) => Object.assign(store, o) } },
    tabs: { get: async (id) => (id in tabs ? { id, url: tabs[id] } : Promise.reject(new Error('no tab'))), onUpdated: { addListener: (f) => { onUpdated = f; } } },
    action: {
      setIcon: async ({ tabId, path }) => { icons[tabId] = { ...icons[tabId], gray: path[16].includes('gray') }; },
      setTitle: async ({ tabId, title }) => { icons[tabId] = { ...icons[tabId], title }; }
    }
  };
  const ctx = vm.createContext({ browser, console, URL, Date, Promise, Object, Map, Boolean, String, JSON });
  ctx.self = ctx;
  for (const f of ['sites.js', 'autoopen.js', 'icon.js', 'background.js']) vm.runInContext(fs.readFileSync(R + f, 'utf8'), ctx);
  ctx.owlResolve = owlResolve;
  ctx.owlLastLookup = {};
  const settle = () => new Promise((r) => setTimeout(r, 10));
  return {
    icons,
    async visit(tabId, url, { tabUrl = url } = {}) {
      if (tabUrl) { tabs[tabId] = tabUrl; onUpdated(tabId, { status: 'loading' }); }
      await new Promise((res) => onMessage({ action: 'checkPage', url }, { tab: { id: tabId } }, res));
      await settle();
    },
    async navigate(tabId, url) { tabs[tabId] = url; onUpdated(tabId, { status: 'loading' }); await settle(); }
  };
}

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
