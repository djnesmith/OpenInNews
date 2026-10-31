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
