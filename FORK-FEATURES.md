# Fork features

Read this before merging upstream. Every item must still work after the merge.

Branch: `main`. Base: `upstream/main` (narenh/OpenInNews), last merged at `6f50c87` (tag `v1.0`).

No tests. Build a plain Release Mac app (without upstream's `NEWS_CLIENT_HEADERS` flag, which `scripts/install-mac.sh` turns on):

```sh
xcodegen generate
xcodebuild -project OpenInNews.xcodeproj -scheme OpenInNewsMac -configuration Release -destination 'platform=macOS' -derivedDataPath build/dd build
```

Copy `build/dd/Build/Products/Release/Open in News.app` to `~/Applications`, open it once, then tick Auto Open in News in Safari › Settings › Extensions. Chrome: `./scripts/build-chrome.sh`, load `build/chrome` unpacked.

## 1. Signed with David's team

`DEVELOPMENT_TEAM` is `CHJ32A2B4N` instead of upstream's `UC3Y84QJ83`. Bundle IDs and app groups use `org.ajdn.` instead of `com.canopysf.` (app `org.ajdn.AutoOpenInNews`, extension `org.ajdn.AutoOpenInNews.Extension`, groups `CHJ32A2B4N.org.ajdn.OpenInNews` on Mac and `group.org.ajdn.OpenInNews` on iOS). Apple IDs are unique across teams and upstream owns theirs, so iOS can't sign without this.

- Commits: the one that adds this entry (`git log -S CHJ32A2B4N --oneline`)
- Files: `project.yml`, `Shared/SharedStatus.swift`, `Extension/Resources/background.js` (`APP_ID` must match the app's bundle ID or native messaging fails)
- Check: `git grep -n -E "UC3Y84QJ83|canopysf" -- . ":!FORK-FEATURES.md"` prints nothing. After install, the app's "Website access" and "Open automatically" rows show coloured lights, not "This build was signed without its app group".

## 2. More News+ sites in the seed list

37 sites added to `sites.js`. Each is on Apple's US News+ list (apple.com/apple-news/publications), has a paywall, and resolved for most current articles on 2026-10-31 (hits out of articles tried):

- North Carolina: newsobserver.com 7/8, heraldsun.com 6/6, charlotteobserver.com 8/8, citizen-times.com 8/8
- Other McClatchy: miamiherald.com 7/8, kansascity.com 8/8, sacbee.com 8/8, star-telegram.com 8/8, kentucky.com 8/8, thestate.com 8/8, islandpacket.com 7/8, fresnobee.com 8/8, idahostatesman.com 8/8
- Newspapers: latimes.com 8/8, washingtonpost.com 8/8, ajc.com 7/8, tampabay.com 7/8, sltrib.com 7/8, theglobeandmail.com 8/8, thestar.com 6/8
- Magazines and business: time.com 8/8, slate.com 8/8, newsweek.com 8/8, newrepublic.com 7/8, businessinsider.com 6/8, fortune.com 4/8, barrons.com 7/8, marketwatch.com 4/8, vogue.com 7/8, gq.com 6/8, bonappetit.com 6/8, harpersbazaar.com 6/8, esquire.com 6/8, popularmechanics.com 6/8, outsideonline.com 6/8, texasmonthly.com 4/4, scientificamerican.com 7/8

The seed list only applies until a site is first toggled in the menu; after that the stored list wins, so an existing install needs these added from the menu.

- Commits: the one that adds this entry (`git log -S heraldsun.com --oneline`)
- Files: `Extension/Resources/sites.js`, `scripts/check-sites.js` (fork-only)
- Check: `node scripts/check-sites.js newsobserver.com charlotteobserver.com latimes.com` reports most hits per site. heraldsun.com's sitemap lists only sponsored posts, so test it with a `heraldsun.com/news/local/article…html` URL. By hand: open a newsobserver.com article in Safari; News opens it.

## 3. Auto-open per site

A site can be set to "button only": it stays on for lookups and the Open in News pill, but never opens News by itself. A hit opens News only when the site is on, global "Open automatically" is on, and the site isn't button only (`autoOpens` in `autoopen.js`). Set it from the popup ("Auto-open on this site") or the app's "Button only" list (add and remove, Mac and iOS). Stored as `manual` + `manualAt` in extension storage and as `manualSites` in the app group; whichever side changed last wins. Safari takes the app's copy on the next article hit or popup open, via the native `pull` action and the `sync` reply.

- Commits: the one that adds this entry (`git log -S autoOpens --oneline`)
- Files: `Extension/Resources/autoopen.js`, `background.js`, `popup.html`, `popup.js`, `manifest.json`, `Chrome/sw.js`, `Extension/SafariWebExtensionHandler.swift`, `Shared/SharedStatus.swift`, `App/OpenInNewsApp.swift`, `test/autoopen.test.js` (fork-only)
- Check: `node --test test/`. By hand: on wsj.com untick "Auto-open on this site"; an article shows the pill but News doesn't open. Add a site in the app's Button only list, then open an article there in Safari; News doesn't open.


## 5. Gray toolbar icon when the article isn't in News

On a turned-on site, an article page that Apple's index has no copy of gets a gray, faded toolbar icon with the tooltip "Not in Apple News", for that tab only. Everything else keeps the normal icon: found articles, pages still being looked up, failed lookups, section fronts, and sites that are off (they are never looked up). The icon resets to normal when the tab starts loading a new page.

- A failed lookup (`owlResolve` threw) is now `undefined` in `background.js`, apart from a real miss (`null`), so a network error never shows gray.
- `icons/gray-{16,32,48}.png` are grayscale copies of the normal icons at 55% opacity; `scripts/make-icons.swift` does not make them.
- Commits: the one that adds this entry (`git log -S NOT_IN_NEWS_ICON --oneline`)
- Files: `Extension/Resources/icon.js`, `icons/gray-*.png`, `background.js`, `manifest.json`, `Chrome/sw.js`, `test/icon.test.js`, `test/background-icon.test.js` (fork-only)
- Check: `node --test test/`. By hand: turn nytimes.com on in the popup and open an article Apple's index doesn't have; the icon goes gray. (On 2026-10-31 https://www.nytimes.com/2026/10/31/world/middleeast/iran-war-israel-us-elections-trump-netanyahu.html was one.)

## 6. One click on the toolbar button opens the article

On an article page News has, when it won't open by itself ("Open automatically" off, or the site is button-only), the toolbar button opens the article in News in one click instead of showing the popup. Option-click shows the popup (settings) there. If the click can't find the article (lookup failed, or the page changed in place), it shows the popup instead. Every other page keeps the popup: articles News lacks, failed lookups, section fronts, sites that are off, and articles that open automatically.

- `checkPage` removes the tab's popup (`action.setPopup` with `''`), so a click fires `action.onClicked`, which opens the article the way the popup's Open in News button does. A new page load puts the popup back, as with the icon (#5).
- Option-click: Safari passes the click's `modifiers` (MDN compat data: `OnClickData` since Safari 15.4, Chrome never). `showSettings` puts the popup back, calls `action.openPopup()` (Safari 16+), then removes it again. If `openPopup` fails, the popup stays, so the next click shows the settings.
- With the popup gone, settings for that site are still reachable: Option-click (Mac), the popup on any other page of the site (e.g. its homepage), and the app (button-only sites). On iOS and in Chrome there is no Option-click.
- Commits: the one that adds this entry (`git log -S showSettings --oneline`)
- Files: `Extension/Resources/background.js`, `test/fake-browser.js`, `test/background-toolbar.test.js`, `test/background-icon.test.js` (fork-only)
- Check: `node --test test/`. By hand: turn "Open automatically" off, open an article News has, click the toolbar button: News opens. Option-click: the popup shows. On the site's homepage the click shows the popup.
