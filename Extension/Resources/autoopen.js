/*
 * Whether a hit on this site opens News by itself: the site is on, automatic
 * opening is on, and the site isn't set to use the button only.
 */
function autoOpens({ sites, auto, manual }, site) {
  return Boolean(site && sites[site] && auto && !manual[site]);
}

if (typeof module !== 'undefined') module.exports = { autoOpens };
