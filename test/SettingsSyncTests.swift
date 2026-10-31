// swiftc -parse-as-library Shared/SettingsSync.swift test/SettingsSyncTests.swift -o build/sync-tests && build/sync-tests
import Foundation

/// A key-value store that counts every read and write.
final class FakeStore: SettingsSync.Store {
    var values: [String: Any] = [:]
    var reads = 0, writes = 0, syncs = 0
    var all: [String: Any] { reads += 1; return values }
    func set(_ value: Any?, forKey key: String) { writes += 1; values[key] = value }
    func synchronize() -> Bool { syncs += 1; return true }
}

typealias Entry = SettingsSync.Entry
nonisolated(unsafe) var failures = 0
func check(_ ok: Bool, _ name: String) {
    print(ok ? "ok   \(name)" : "FAIL \(name)")
    if !ok { failures += 1 }
}

@main
enum SettingsSyncTests {
    static func main() {

        // Sync off: no reads, no writes, local settings unchanged.
        do {
            let store = FakeStore()
            store.values["settings.auto"] = ["value": false, "at": 999.0]
            let local = ["auto": Entry(value: true, at: 1)]
            var opened = false
            let result = SettingsSync.sync(local, enabled: false, store: { opened = true; return store })
            check(!opened && store.reads == 0 && store.writes == 0 && store.syncs == 0, "off: store not opened, no reads or writes")
            check(result == local, "off: keeps local settings")
        }

        // Off → change locally → on: the local change merges in and reaches the store.
        do {
            let store = FakeStore()
            store.values["settings.site:wsj.com"] = ["value": true, "at": 100.0]
            var local = SettingsSync.sync([:], enabled: true, store: { store })
            local["site:wsj.com"] = Entry(value: false, at: 200)  // changed while sync was off
            _ = SettingsSync.sync(local, enabled: false, store: { store })
            let merged = SettingsSync.sync(local, enabled: true, store: { store })
            check(merged["site:wsj.com"] == Entry(value: false, at: 200), "back on: local change wins when newer")
            check(SettingsSync.decode(["x": store.values["settings.site:wsj.com"]!])["x"] == Entry(value: false, at: 200), "back on: store gets the change")
        }

        // A newer key in the store beats an older local one; keys merge one by one.
        do {
            let store = FakeStore()
            store.values["settings.auto"] = ["value": false, "at": 500.0]
            store.values["settings.site:wired.com"] = ["value": true, "at": 10.0]
            store.values["probe.app.mac"] = 123.0
            let local = ["auto": Entry(value: true, at: 400), "site:wsj.com": Entry(value: true, at: 50)]
            let merged = SettingsSync.sync(local, enabled: true, store: { store })
            check(merged == ["auto": Entry(value: false, at: 500), "site:wsj.com": Entry(value: true, at: 50),
                             "site:wired.com": Entry(value: true, at: 10)], "newer remote wins, other keys kept, foreign keys ignored")
            check(store.writes == 1 && store.values["settings.site:wsj.com"] != nil, "writes only the key the store was behind on")
        }

        // Nothing to write: no synchronize call.
        do {
            let store = FakeStore()
            store.values["settings.auto"] = ["value": true, "at": 5.0]
            _ = SettingsSync.sync(["auto": Entry(value: true, at: 5)], enabled: true, store: { store })
            check(store.writes == 0 && store.syncs == 0, "in step: no writes")
        }

        // JSON from the extension decodes; junk is dropped.
        do {
            let json = try! JSONSerialization.jsonObject(with: Data(#"{"auto":{"value":true,"at":1730000000000},"bad":{"value":1}}"#.utf8))
            check(SettingsSync.decode(json) == ["auto": Entry(value: true, at: 1_730_000_000_000)], "decodes extension JSON, drops junk")
        }

        print(failures == 0 ? "all passed" : "\(failures) failed")
        exit(failures == 0 ? 0 : 1)
    }
}
