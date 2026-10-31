/*
 * The toolbar icon for a tab: gray when Apple's index has no copy of the page
 * (`id` is null), the normal icon otherwise, including while a lookup runs, when
 * it failed, and on pages that aren't looked up.
 */
const NOT_IN_NEWS_ICON = { 16: 'icons/gray-16.png', 32: 'icons/gray-32.png', 48: 'icons/gray-48.png' };

function iconFor(id, manifest) {
  return id === null
    ? { path: NOT_IN_NEWS_ICON, title: 'Not in Apple News' }
    : { path: manifest.action.default_icon, title: manifest.name };
}

if (typeof module !== 'undefined') module.exports = { iconFor };
