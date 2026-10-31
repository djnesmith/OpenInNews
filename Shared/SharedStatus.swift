import Foundation

/// The extension's settings as it last reported them, shared with the app
/// through the app group. Safari keeps the real settings in the extension's
/// own storage, which the app can't read.
struct ExtensionStatus: Codable {
    var sites: [String: Bool]   // site -> on/off
    var auto: Bool
    var seen: [String: Double]  // site -> when the extension last ran there (ms since 1970)
    var active: Double          // when the extension last ran anywhere (ms since 1970)
    var lastLookup: Lookup?
    var manual: [String: Bool]?  // site -> true: button only, never opens News by itself
    var manualAt: Double?        // when manual last changed in Safari (ms since 1970)

    struct Lookup: Codable {
        var ranged: Bool        // fetched part of the index rather than the whole bucket file
        var native: Bool?       // looked up by the app extension rather than in the browser
        var newsHeaders: Bool?  // sent News's own request headers (builds you install yourself)
        var ms: Double
        var at: Double          // ms since 1970
    }

    func lastSeen(_ site: String) -> Date? {
        seen[site].map { Date(timeIntervalSince1970: $0 / 1000) }
    }
}

enum SharedStatus {
    static let extensionID = "org.ajdn.AutoOpenInNews.Extension"
    #if os(macOS)
    private static let group = "CHJ32A2B4N.org.ajdn.OpenInNews" // team-prefixed: no profile needed
    #else
    private static let group = "group.org.ajdn.OpenInNews"
    #endif
    private static let defaults = UserDefaults(suiteName: group)

    /// False in a build signed without the app group entitlement, where the
    /// extension's reports can't reach the app.
    static var isAvailable: Bool {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) != nil
    }
    private static let statusKey = "extensionStatus"
    private static let syncedKey = "syncedAt"
    private static let manualKey = "manualSites"

    static func save(_ json: Any) {
        guard let data = try? JSONSerialization.data(withJSONObject: json),
              (try? JSONDecoder().decode(ExtensionStatus.self, from: data)) != nil else { return }
        defaults?.set(data, forKey: statusKey)
        defaults?.set(Date(), forKey: syncedKey)
    }

    /// Button-only sites as last edited in the app, with when (ms since 1970).
    /// The extension takes them when they're newer than its own copy.
    static func loadManual() -> (sites: [String: Bool], at: Double)? {
        guard let stored = defaults?.dictionary(forKey: manualKey),
              let sites = stored["manual"] as? [String: Bool],
              let at = stored["manualAt"] as? Double else { return nil }
        return (sites, at)
    }

    static func saveManual(_ sites: [String: Bool]) {
        defaults?.set(["manual": sites, "manualAt": Date().timeIntervalSince1970 * 1000], forKey: manualKey)
    }

    static func load() -> (status: ExtensionStatus, syncedAt: Date)? {
        guard let data = defaults?.data(forKey: statusKey),
              let status = try? JSONDecoder().decode(ExtensionStatus.self, from: data),
              let syncedAt = defaults?.object(forKey: syncedKey) as? Date else { return nil }
        return (status, syncedAt)
    }
}
