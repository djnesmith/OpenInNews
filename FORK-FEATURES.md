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
