# Fork features

Read this before merging upstream. Every item must still work after the merge.

Branch: `main`. Base: `upstream/main` (narenh/OpenInNews), last merged at `6f50c87` (tag `v1.0`).

No tests. Build and install the Mac app with `./scripts/install-mac.sh` (needs `brew install xcodegen`; output `/Applications/Open in News.app`), then tick Auto Open in News in Safari › Settings › Extensions. Chrome: `./scripts/build-chrome.sh`, load `build/chrome` unpacked. `project.yml` signs with upstream's team `UC3Y84QJ83`; pass `DEVELOPMENT_TEAM=CHJ32A2B4N` to build here.

None yet.
