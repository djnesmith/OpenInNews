/*
 * Settings as flat keys, so devices can merge them one key at a time:
 * "auto", "site:<host>" and "manual:<host>", each { value, at }. `at` is when
 * the key last changed (ms since 1970), 0 for a default nobody has touched.
 */
function settingsEntries({ sites, auto, manual, stamps }) {
  const entries = { auto: { value: auto, at: stamps.auto ?? 0 } };
  for (const [site, on] of Object.entries(sites)) entries[`site:${site}`] = { value: on, at: stamps[`site:${site}`] ?? 0 };
  for (const [site, on] of Object.entries(manual)) entries[`manual:${site}`] = { value: on, at: stamps[`manual:${site}`] ?? 0 };
  return entries;
}

/* The settings with every entry newer than ours taken in, or null if none is newer. */
function applyEntries(settings, entries) {
  const next = { sites: { ...settings.sites }, auto: settings.auto, manual: { ...settings.manual }, stamps: { ...settings.stamps } };
  let changed = false;
  for (const [key, entry] of Object.entries(entries ?? {})) {
    if (!(entry?.at > (next.stamps[key] ?? 0))) continue;
    const site = key.slice(key.indexOf(':') + 1);
    if (key === 'auto') next.auto = entry.value;
    else if (key.startsWith('site:')) next.sites[site] = entry.value;
    else if (key.startsWith('manual:')) next.manual[site] = entry.value;
    else continue;
    next.stamps[key] = entry.at;
    changed = true;
  }
  return changed ? next : null;
}

if (typeof module !== 'undefined') module.exports = { settingsEntries, applyEntries };
