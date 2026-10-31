#!/usr/bin/env node
/*
 * Like check-site.js, but uses background.js's article rule (slug or 6+ digit ID)
 * and falls back to the site's robots.txt sitemaps when the homepage blocks bots.
 *
 *   node scripts/check-sites.js newsobserver.com latimes.com …
 *   SITEMAP=1 node scripts/check-sites.js …   (skip the homepage)
 */
const { owlResolve } = require('../Extension/Resources/owl.js');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
const isArticle = (u) => { const last = u.pathname.split('/').filter(Boolean).pop() ?? ''; return (last.match(/-/g) ?? []).length >= 3 || /\d{6,}/.test(last); };
const get = (u) => fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) }).then((r) => r.ok ? r.text() : '').catch(() => '');
const own = (u, site) => u.hostname === site || u.hostname.endsWith('.' + site);
const keep = (u, site) => own(u, site) && isArticle(u) && !/\.(css|js|png|jpe?g|svg|xml|gif|webp)$/i.test(u.pathname);
/* Article URLs from the site's news sitemap, for homepages that block bots or render in JS. */
async function sitemapLinks(site) {
  const robots = await get(`https://www.${site}/robots.txt`) || await get(`https://${site}/robots.txt`);
  const maps = [...robots.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]).filter((m) => !/archive/i.test(m));
  maps.sort((a, b) => /news/i.test(b) - /news/i.test(a));
  const out = new Set();
  for (const m of maps.slice(0, 3)) {
    let xml = await get(m);
    const sub = [...xml.matchAll(/<sitemap>\s*<loc>([^<]+)/g)].map((x) => x[1].trim());
    if (sub.length) xml = await get(sub.find((x) => /news/i.test(x)) ?? sub[0]);
    for (const [, loc] of xml.matchAll(/<loc>(?:<!\[CDATA\[)?([^<\]]+)/g)) {
      let u; try { u = new URL(loc.trim().replace(/&amp;/g, '&')); } catch { continue; }
      if (keep(u, site)) out.add(u.origin + u.pathname);
      if (out.size >= 8) return [...out];
    }
  }
  return [...out];
}
async function links(site) {
  const l = process.env.SITEMAP ? {} : await homeLinks(site);
  if (l.list?.length >= 3) return l;
  const sm = await sitemapLinks(site);
  return sm.length ? { list: sm, via: 'sitemap' } : (l.list ? { list: l.list } : { err: l.err ?? 'no article links' });
}
async function homeLinks(site) {
  let res;
  for (const h of [`https://www.${site}/`, `https://${site}/`]) {
    try { res = await fetch(h, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) }); if (res.ok) break; } catch {}
  }
  if (!res?.ok) return { err: `homepage ${res?.status ?? 'unreachable'}` };
  const html = await res.text(), out = new Set();
  for (const [, href] of html.matchAll(/href="([^"#]+)"/g)) {
    let u; try { u = new URL(href.replace(/&amp;/g, '&'), res.url); } catch { continue; }
    if (u.hostname !== site && !u.hostname.endsWith('.' + site)) continue;
    if (keep(u, site)) out.add(u.origin + u.pathname);
  }
  return { list: [...out].slice(0, 8) };
}
(async () => {
  for (const site of process.argv.slice(2)) {
    const { list, err, via } = await links(site);
    if (err) { console.log(`${site.padEnd(26)} ${err}`); continue; }
    const ids = await Promise.all(list.map((u) => owlResolve(u).catch(() => null)));
    const hits = list.filter((_, i) => ids[i]);
    console.log(`${site.padEnd(26)} ${hits.length}/${list.length}${via ? ' (sitemap)' : ''}  ${hits.slice(0, 2).map((u, i) => u + ' -> ' + ids[list.indexOf(u)]).join('  ')}${list.length && !hits.length ? '  miss e.g. ' + list[0] : ''}`);
  }
})();
