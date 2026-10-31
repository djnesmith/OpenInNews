import Foundation

/// Settings as flat keys ("auto", "site:<host>", "manual:<host>"), each with when
/// it last changed (ms since 1970). Devices merge them key by key; the newer wins.
/// sync.js has the same format on the extension's side.
enum SettingsSync {
    struct Entry: Equatable {
        var value: Bool
        var at: Double
    }

    /// The iCloud key-value store, or a fake one in tests.
    protocol Store: AnyObject {
        var all: [String: Any] { get }
        func set(_ value: Any?, forKey key: String)
        @discardableResult func synchronize() -> Bool
    }

    /// Setting keys sit under this prefix in the store, apart from anything else.
    static let prefix = "settings."

    static func newest(_ a: [String: Entry], _ b: [String: Entry]) -> [String: Entry] {
        a.merging(b) { $1.at > $0.at ? $1 : $0 }
    }

    /// Merges `local` with the store and writes back the keys the store was behind on.
    /// With sync off it doesn't open the store at all and returns `local`.
    static func sync(_ local: [String: Entry], enabled: Bool, store openStore: () -> Store) -> [String: Entry] {
        guard enabled else { return local }
        let store = openStore()
        let remote = decode(store.all.filter { $0.key.hasPrefix(prefix) }
            .reduce(into: [:]) { $0[String($1.key.dropFirst(prefix.count))] = $1.value })
        let merged = newest(local, remote)
        let behind = merged.filter { remote[$0.key] != $0.value }
        for (key, entry) in behind {
            store.set(encode(entry), forKey: prefix + key)
        }
        if !behind.isEmpty { store.synchronize() }
        return merged
    }

    // MARK: Plist and JSON form: { key: { "value": Bool, "at": Double } }

    static func encode(_ entry: Entry) -> [String: Any] {
        ["value": entry.value, "at": entry.at]
    }

    static func encode(_ entries: [String: Entry]) -> [String: Any] {
        entries.mapValues { encode($0) }
    }

    static func decode(_ raw: Any?) -> [String: Entry] {
        guard let raw = raw as? [String: Any] else { return [:] }
        return raw.compactMapValues { item in
            guard let item = item as? [String: Any],
                  let value = item["value"] as? Bool,
                  let at = (item["at"] as? NSNumber)?.doubleValue else { return nil }
            return Entry(value: value, at: at)
        }
    }
}

extension NSUbiquitousKeyValueStore: SettingsSync.Store {
    var all: [String: Any] { dictionaryRepresentation }
}
