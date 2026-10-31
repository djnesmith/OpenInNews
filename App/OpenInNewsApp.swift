import SafariServices
import SwiftUI

@main
struct OpenInNewsApp: App {
    var body: some Scene {
        WindowGroup {
            StatusView()
            #if os(macOS)
                .frame(minWidth: 440, idealWidth: 480, minHeight: 520, idealHeight: 640)
            #endif
        }
        #if os(macOS)
        .windowResizability(.contentSize)
        #endif
    }
}

// MARK: - Model

@Observable
final class StatusModel {
    /// nil when iOS can't say (before 26.2).
    var extensionEnabled: Bool?
    var status: ExtensionStatus?
    var syncedAt: Date?
    /// Sites set to the button only: Safari's copy or the app's, whichever changed last.
    var manualSites: [String] = []

    func refresh() async {
        #if os(macOS)
        extensionEnabled = try? await SFSafariExtensionManager.stateOfSafariExtension(withIdentifier: SharedStatus.extensionID).isEnabled
        #else
        if #available(iOS 26.2, *) {
            extensionEnabled = try? await SFSafariExtensionManager.stateOfExtension(withIdentifier: SharedStatus.extensionID).isEnabled
        }
        #endif
        let shared = SharedStatus.load()
        status = shared?.status
        syncedAt = shared?.syncedAt
        manualSites = currentManual().filter(\.value).map(\.key).sorted()
    }

    private func currentManual() -> [String: Bool] {
        let fromSafari = (sites: status?.manual ?? [:], at: status?.manualAt ?? 0)
        guard let fromApp = SharedStatus.loadManual(), fromApp.at > fromSafari.at else { return fromSafari.sites }
        return fromApp.sites
    }

    func setManual(_ site: String, _ on: Bool) {
        var sites = currentManual()
        sites[site] = on ? true : nil
        SharedStatus.saveManual(sites)
        manualSites = sites.filter(\.value).map(\.key).sorted()
    }
}

/// A site counts as reachable if the extension ran there recently, which it
/// can only do once you've allowed it on that site.
private let recentlySeen: TimeInterval = 30 * 24 * 3600

// MARK: - Lights

enum Light {
    case green, yellow, red, off

    var color: Color {
        switch self {
        case .green: .green
        case .yellow: .yellow
        case .red: .red
        case .off: .gray.opacity(0.45)
        }
    }
}

struct StatusLight: View {
    let light: Light

    var body: some View {
        Circle()
            .fill(light.color.gradient)
            .frame(width: 14, height: 14)
            .shadow(color: light == .off ? .clear : light.color.opacity(0.7), radius: 5)
    }
}

struct StatusRow<Detail: View>: View {
    let light: Light
    let title: String
    @ViewBuilder let detail: Detail

    var body: some View {
        HStack(spacing: 14) {
            StatusLight(light: light)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                detail
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Screen

struct StatusView: View {
    @State private var model = StatusModel()
    @State private var newManualSite = ""
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    extensionRow
                    if SharedStatus.isAvailable {
                        accessRow
                        autoRow
                        lookupRow
                    }
                } footer: {
                    if !SharedStatus.isAvailable {
                        Text("This build was signed without its app group, so it can’t show the extension’s settings.")
                    }
                }
                if let status = model.status {
                    sitesSection(status)
                }
                if SharedStatus.isAvailable {
                    manualSection
                }
                if !allGreen {
                    setupSection
                }
                Section {
                    Text("Lookups use Apple’s public News index; the URLs you read never leave your device. There is no server and no analytics.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .formStyle(.grouped)
            .navigationTitle("Auto Open in News")
            .refreshable { await model.refresh() }
        }
        .task(id: scenePhase) {
            if scenePhase == .active { await model.refresh() }
        }
    }

    @ViewBuilder
    private var extensionRow: some View {
        switch model.extensionEnabled {
        case true?:
            StatusRow(light: .green, title: "Safari extension") { Text("On") }
        case false?:
            StatusRow(light: .red, title: "Safari extension") { Text("Off — turn it on in Safari’s settings") }
        case nil:
            StatusRow(light: .off, title: "Safari extension") { Text("iOS can’t report this before 26.2") }
        }
        Button("Open Safari Extension Settings") {
            openExtensionSettings()
        }
    }

    /// Opens Safari's settings at this extension: on/off, and its website access.
    private func openExtensionSettings() {
        #if os(macOS)
        SFSafariApplication.showPreferencesForExtension(withIdentifier: SharedStatus.extensionID)
        #else
        if #available(iOS 26.2, *) {
            SFSafariSettings.openExtensionsSettings(forIdentifiers: [SharedStatus.extensionID])
        } else if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
        #endif
    }

    private var reachableSites: [String] {
        guard let status = model.status else { return [] }
        return status.sites.filter { site, on in
            on && (status.lastSeen(site).map { -$0.timeIntervalSinceNow < recentlySeen } ?? false)
        }.map(\.key)
    }

    @ViewBuilder
    private var accessRow: some View {
        if model.extensionEnabled == false {
            StatusRow(light: .red, title: "Website access") { Text("Needs the extension turned on") }
        } else if model.status == nil {
            StatusRow(light: .yellow, title: "Website access") { Text("Not reported yet — open a publisher’s article in Safari") }
        } else if reachableSites.isEmpty {
            StatusRow(light: .yellow, title: "Website access") { Text("Not seen on any site yet — allow it when Safari asks") }
        } else {
            let on = model.status?.sites.values.filter { $0 }.count ?? 0
            StatusRow(light: .green, title: "Website access") { Text("Working on \(reachableSites.count) of \(on) sites") }
        }
    }

    @ViewBuilder
    private var autoRow: some View {
        if let status = model.status {
            if status.auto {
                StatusRow(light: .green, title: "Open automatically") { Text("On") }
            } else {
                StatusRow(light: .yellow, title: "Open automatically") { Text("Off — tap Open in News on the page") }
            }
        } else {
            StatusRow(light: .off, title: "Open automatically") { Text("Not reported yet") }
        }
    }

    @ViewBuilder
    private var lookupRow: some View {
        if let lookup = model.status?.lastLookup {
            let at = Date(timeIntervalSince1970: lookup.at / 1000)
            StatusRow(light: lookup.ranged ? .green : .yellow, title: "Last lookup") {
                Text("\(Int(lookup.ms)) ms · \(lookup.ranged ? "partial" : "whole") index download\(lookup.native == true ? " by the app extension" : " by Safari")\(lookup.newsHeaders == true ? " as News" : "") · \(at, format: .relative(presentation: .named))")
            }
        }
    }

    private func sitesSection(_ status: ExtensionStatus) -> some View {
        Section {
            ForEach(status.sites.keys.sorted(), id: \.self) { site in
                if status.sites[site] == true {
                    if let seen = status.lastSeen(site) {
                        StatusRow(light: -seen.timeIntervalSinceNow < recentlySeen ? .green : .yellow, title: site) {
                            Text("Last checked \(seen, format: .relative(presentation: .named))")
                        }
                    } else {
                        StatusRow(light: .yellow, title: site) { Text("Not visited yet") }
                    }
                } else {
                    StatusRow(light: .off, title: site) { Text("Off") }
                }
            }
        } header: {
            Text("Sites")
        } footer: {
            if let syncedAt = model.syncedAt {
                Text("Reported by Safari \(syncedAt, format: .relative(presentation: .named)). Add or remove sites from the extension’s menu in the address bar.")
            }
        }
    }

    private var manualSection: some View {
        Section {
            ForEach(model.manualSites, id: \.self) { site in
                HStack {
                    Text(site)
                    Spacer()
                    Button("Remove", role: .destructive) { model.setManual(site, false) }
                }
            }
            HStack {
                TextField("example.com", text: $newManualSite)
                    .autocorrectionDisabled()
                #if os(iOS)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                #endif
                    .onSubmit(addManualSite)
                Button("Add", action: addManualSite)
                    .disabled(manualSiteToAdd.isEmpty)
            }
        } header: {
            Text("Button only")
        } footer: {
            Text("These sites show the Open in News button but never open News by themselves. Safari picks up changes the next time it finds an article.")
        }
    }

    /// What the user typed, as a site key: lowercase, no "www.".
    private var manualSiteToAdd: String {
        let site = newManualSite.trimmingCharacters(in: .whitespaces).lowercased()
        return site.hasPrefix("www.") ? String(site.dropFirst(4)) : site
    }

    private func addManualSite() {
        guard !manualSiteToAdd.isEmpty else { return }
        model.setManual(manualSiteToAdd, true)
        newManualSite = ""
    }

    private var allGreen: Bool {
        model.extensionEnabled != false && (!reachableSites.isEmpty || !SharedStatus.isAvailable)
    }

    private var setupSection: some View {
        Section("Set up") {
            #if os(macOS)
            Label("Open Safari › Settings › Extensions", systemImage: "1.circle")
            Label("Tick Auto Open in News", systemImage: "2.circle")
            #else
            Label("Tap Open Safari Extension Settings above", systemImage: "1.circle")
            Label("Turn Auto Open in News on", systemImage: "2.circle")
            #endif
            Label("Open a publisher’s article in Safari and allow the extension there", systemImage: "3.circle")
        }
    }
}
