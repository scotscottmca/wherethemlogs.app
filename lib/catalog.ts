/**
 * SEED CATALOGUE.
 *
 * Every entry below is a real, verifiable log location, but this module is a
 * stand-in for the database the product ships with. Replace `ENTRIES` with the
 * DB query layer; `searchCatalog` is the seam and its signature should not
 * need to change.
 */

export type Platform = "windows" | "macos" | "linux";

export type PathRow = {
  label: string;
  path: string;
  note?: string;
};

export type Entry = {
  id: string;
  app: string;
  vendor: string;
  aliases: string[];
  platform: Platform;
  /** Distinguishes shipping flavours of the same app, e.g. "Classic (v1)". */
  variant?: string;
  paths: PathRow[];
  /** Installer and architecture qualifiers: msi, exe, pkg, deb, x64, ... */
  types: string[];
  scope: "per-user" | "per-machine" | "system";
  /** Seed ordering for the recent-additions rack. */
  added: string;
};

export const PLATFORMS: { id: Platform; code: string; name: string }[] = [
  { id: "windows", code: "WIN", name: "Windows" },
  { id: "macos", code: "MAC", name: "macOS" },
  { id: "linux", code: "LNX", name: "Linux" },
];

export const TYPE_GROUPS: { label: string; types: string[] }[] = [
  { label: "Installer", types: ["msi", "exe", "msix", "appx", "pkg", "dmg", "deb", "rpm", "snap", "flatpak", "appimage"] },
  { label: "Architecture", types: ["x86", "x64", "arm64"] },
  { label: "Scope", types: ["per-user", "per-machine", "system"] },
];

const ENTRIES: Entry[] = [
  {
    id: "chrome-win",
    app: "Google Chrome",
    vendor: "Google",
    aliases: ["chrome", "gchrome"],
    platform: "windows",
    paths: [
      { label: "Debug log", path: "%LOCALAPPDATA%\\Google\\Chrome\\User Data\\chrome_debug.log", note: "Only written when Chrome is started with --enable-logging" },
      { label: "Crash reports", path: "%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Crashpad\\reports\\" },
    ],
    types: ["msi", "exe", "x64", "arm64", "per-user", "per-machine"],
    scope: "per-user",
    added: "2026-09-02",
  },
  {
    id: "chrome-mac",
    app: "Google Chrome",
    vendor: "Google",
    aliases: ["chrome"],
    platform: "macos",
    paths: [
      { label: "Debug log", path: "~/Library/Application Support/Google/Chrome/chrome_debug.log", note: "Requires --enable-logging --v=1" },
      { label: "Crash reports", path: "~/Library/Application Support/Google/Chrome/Crashpad/completed/" },
    ],
    types: ["dmg", "pkg", "x64", "arm64", "per-user"],
    scope: "per-user",
    added: "2026-09-02",
  },
  {
    id: "chrome-linux",
    app: "Google Chrome",
    vendor: "Google",
    aliases: ["chrome", "google-chrome"],
    platform: "linux",
    paths: [
      { label: "Debug log", path: "~/.config/google-chrome/chrome_debug.log" },
      { label: "Crash dumps", path: "~/.config/google-chrome/Crash Reports/" },
    ],
    types: ["deb", "rpm", "x64", "per-machine"],
    scope: "per-user",
    added: "2026-09-02",
  },
  {
    id: "teams-new-win",
    app: "Microsoft Teams",
    vendor: "Microsoft",
    aliases: ["teams", "msteams", "teams 2.0"],
    platform: "windows",
    variant: "New Teams (MSIX)",
    paths: [
      { label: "Client logs", path: "%LOCALAPPDATA%\\Packages\\MSTeams_8wekyb3d8bbwe\\LocalCache\\Microsoft\\MSTeams\\Logs\\" },
      { label: "Diagnostic bundle", path: "%USERPROFILE%\\Downloads\\MSTeams Diagnostics Log <date>.txt", note: "Written by Ctrl+Alt+Shift+1" },
    ],
    types: ["msix", "x64", "arm64", "per-user"],
    scope: "per-user",
    added: "2026-09-05",
  },
  {
    id: "teams-classic-win",
    app: "Microsoft Teams",
    vendor: "Microsoft",
    aliases: ["teams", "msteams"],
    platform: "windows",
    variant: "Classic (v1)",
    paths: [
      { label: "Desktop log", path: "%APPDATA%\\Microsoft\\Teams\\logs.txt" },
      { label: "Media stack log", path: "%APPDATA%\\Microsoft\\Teams\\media-stack\\" },
    ],
    types: ["msi", "exe", "x86", "x64", "per-user", "per-machine"],
    scope: "per-user",
    added: "2026-08-14",
  },
  {
    id: "teams-mac",
    app: "Microsoft Teams",
    vendor: "Microsoft",
    aliases: ["teams", "msteams"],
    platform: "macos",
    variant: "New Teams",
    paths: [
      { label: "Client logs", path: "~/Library/Containers/com.microsoft.teams2/Data/Library/Application Support/Microsoft/MSTeams/Logs/" },
    ],
    types: ["pkg", "x64", "arm64", "per-user"],
    scope: "per-user",
    added: "2026-09-05",
  },
  {
    id: "slack-win",
    app: "Slack",
    vendor: "Slack Technologies",
    aliases: ["slack"],
    platform: "windows",
    paths: [
      { label: "Application logs", path: "%APPDATA%\\Slack\\logs\\" },
      { label: "Renderer console", path: "%APPDATA%\\Slack\\logs\\browser.log" },
    ],
    types: ["msi", "exe", "x64", "arm64", "per-user", "per-machine"],
    scope: "per-user",
    added: "2026-08-28",
  },
  {
    id: "slack-mac",
    app: "Slack",
    vendor: "Slack Technologies",
    aliases: ["slack"],
    platform: "macos",
    paths: [{ label: "Application logs", path: "~/Library/Application Support/Slack/logs/" }],
    types: ["dmg", "mas", "x64", "arm64", "per-user"],
    scope: "per-user",
    added: "2026-08-28",
  },
  {
    id: "slack-linux",
    app: "Slack",
    vendor: "Slack Technologies",
    aliases: ["slack"],
    platform: "linux",
    paths: [{ label: "Application logs", path: "~/.config/Slack/logs/" }],
    types: ["deb", "rpm", "snap", "x64", "per-machine"],
    scope: "per-user",
    added: "2026-08-28",
  },
  {
    id: "vscode-win",
    app: "Visual Studio Code",
    vendor: "Microsoft",
    aliases: ["vscode", "code", "vs code"],
    platform: "windows",
    paths: [
      { label: "Session logs", path: "%APPDATA%\\Code\\logs\\", note: "One folder per session, newest last" },
      { label: "Crash dumps", path: "%APPDATA%\\Code\\Crashpad\\reports\\" },
    ],
    types: ["exe", "msi", "x64", "arm64", "per-user", "per-machine"],
    scope: "per-user",
    added: "2026-09-01",
  },
  {
    id: "vscode-mac",
    app: "Visual Studio Code",
    vendor: "Microsoft",
    aliases: ["vscode", "code"],
    platform: "macos",
    paths: [{ label: "Session logs", path: "~/Library/Application Support/Code/logs/" }],
    types: ["dmg", "x64", "arm64", "per-user"],
    scope: "per-user",
    added: "2026-09-01",
  },
  {
    id: "vscode-linux",
    app: "Visual Studio Code",
    vendor: "Microsoft",
    aliases: ["vscode", "code"],
    platform: "linux",
    paths: [{ label: "Session logs", path: "~/.config/Code/logs/" }],
    types: ["deb", "rpm", "snap", "x64", "arm64", "per-machine"],
    scope: "per-user",
    added: "2026-09-01",
  },
  {
    id: "intune-win",
    app: "Intune Management Extension",
    vendor: "Microsoft",
    aliases: ["intune", "ime", "sidecar"],
    platform: "windows",
    paths: [
      { label: "Agent logs", path: "C:\\ProgramData\\Microsoft\\IntuneManagementExtension\\Logs\\" },
      { label: "Win32 app log", path: "C:\\ProgramData\\Microsoft\\IntuneManagementExtension\\Logs\\IntuneManagementExtension.log" },
    ],
    types: ["msi", "x64", "per-machine"],
    scope: "per-machine",
    added: "2026-09-08",
  },
  {
    id: "intune-mac",
    app: "Intune Company Portal",
    vendor: "Microsoft",
    aliases: ["intune", "company portal"],
    platform: "macos",
    paths: [
      { label: "Agent logs", path: "/Library/Logs/Microsoft/Intune/" },
      { label: "Shell script output", path: "/Library/Application Support/Microsoft/Intune/SideCar/" },
    ],
    types: ["pkg", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-09-08",
  },
  {
    id: "sccm-win",
    app: "Configuration Manager Client",
    vendor: "Microsoft",
    aliases: ["sccm", "mecm", "ccmexec", "configmgr"],
    platform: "windows",
    paths: [
      { label: "Client logs", path: "C:\\Windows\\CCM\\Logs\\" },
      { label: "Setup logs", path: "C:\\Windows\\ccmsetup\\Logs\\ccmsetup.log" },
      { label: "App deployment", path: "C:\\Windows\\CCM\\Logs\\AppEnforce.log" },
    ],
    types: ["msi", "x86", "x64", "per-machine"],
    scope: "per-machine",
    added: "2026-09-07",
  },
  {
    id: "msi-win",
    app: "Windows Installer",
    vendor: "Microsoft",
    aliases: ["msiexec", "msi", "windows installer"],
    platform: "windows",
    paths: [
      { label: "Verbose install log", path: "%TEMP%\\MSI*.LOG", note: "Requires the Logging policy or msiexec /L*v <path>" },
      { label: "Event log source", path: "Application log, source MsiInstaller" },
    ],
    types: ["msi", "x86", "x64", "system"],
    scope: "system",
    added: "2026-08-30",
  },
  {
    id: "wu-win",
    app: "Windows Update",
    vendor: "Microsoft",
    aliases: ["wu", "windows update", "usoclient"],
    platform: "windows",
    paths: [
      { label: "ETL traces", path: "C:\\Windows\\Logs\\WindowsUpdate\\", note: "Convert with Get-WindowsUpdateLog" },
      { label: "Reporting events", path: "C:\\Windows\\SoftwareDistribution\\ReportingEvents.log" },
      { label: "Servicing stack", path: "C:\\Windows\\Logs\\CBS\\CBS.log" },
    ],
    types: ["system", "x64", "arm64"],
    scope: "system",
    added: "2026-08-22",
  },
  {
    id: "defender-win",
    app: "Microsoft Defender Antivirus",
    vendor: "Microsoft",
    aliases: ["defender", "mpcmdrun", "windows defender"],
    platform: "windows",
    paths: [
      { label: "Support logs", path: "C:\\ProgramData\\Microsoft\\Windows Defender\\Support\\" },
      { label: "Scan results", path: "C:\\ProgramData\\Microsoft\\Windows Defender\\Support\\MPLog-*.log" },
    ],
    types: ["system", "x64", "arm64"],
    scope: "system",
    added: "2026-08-19",
  },
  {
    id: "onedrive-win",
    app: "OneDrive",
    vendor: "Microsoft",
    aliases: ["onedrive", "od4b"],
    platform: "windows",
    paths: [
      { label: "Sync engine logs", path: "%LOCALAPPDATA%\\Microsoft\\OneDrive\\logs\\" },
      { label: "Setup log", path: "%LOCALAPPDATA%\\Microsoft\\OneDrive\\setup\\logs\\" },
    ],
    types: ["exe", "msi", "x86", "x64", "arm64", "per-user", "per-machine"],
    scope: "per-user",
    added: "2026-08-11",
  },
  {
    id: "onedrive-mac",
    app: "OneDrive",
    vendor: "Microsoft",
    aliases: ["onedrive"],
    platform: "macos",
    paths: [{ label: "Sync engine logs", path: "~/Library/Logs/OneDrive/" }],
    types: ["pkg", "mas", "x64", "arm64", "per-user"],
    scope: "per-user",
    added: "2026-08-11",
  },
  {
    id: "docker-win",
    app: "Docker Desktop",
    vendor: "Docker",
    aliases: ["docker", "docker desktop"],
    platform: "windows",
    paths: [
      { label: "Desktop logs", path: "%LOCALAPPDATA%\\Docker\\log\\" },
      { label: "VM logs", path: "%LOCALAPPDATA%\\Docker\\log\\vm\\" },
    ],
    types: ["exe", "x64", "arm64", "per-machine"],
    scope: "per-machine",
    added: "2026-09-03",
  },
  {
    id: "docker-mac",
    app: "Docker Desktop",
    vendor: "Docker",
    aliases: ["docker"],
    platform: "macos",
    paths: [
      { label: "Desktop logs", path: "~/Library/Containers/com.docker.docker/Data/log/" },
      { label: "Host log", path: "~/Library/Containers/com.docker.docker/Data/log/host/" },
    ],
    types: ["dmg", "x64", "arm64", "per-user"],
    scope: "per-user",
    added: "2026-09-03",
  },
  {
    id: "docker-linux",
    app: "Docker Engine",
    vendor: "Docker",
    aliases: ["docker", "dockerd"],
    platform: "linux",
    paths: [
      { label: "Daemon journal", path: "journalctl -u docker.service", note: "systemd hosts; no flat file by default" },
      { label: "Container logs", path: "/var/lib/docker/containers/<id>/<id>-json.log" },
    ],
    types: ["deb", "rpm", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-09-03",
  },
  {
    id: "zoom-win",
    app: "Zoom Workplace",
    vendor: "Zoom",
    aliases: ["zoom"],
    platform: "windows",
    paths: [{ label: "Client logs", path: "%APPDATA%\\Zoom\\logs\\" }],
    types: ["msi", "exe", "x86", "x64", "arm64", "per-user", "per-machine"],
    scope: "per-user",
    added: "2026-08-25",
  },
  {
    id: "zoom-mac",
    app: "Zoom Workplace",
    vendor: "Zoom",
    aliases: ["zoom"],
    platform: "macos",
    paths: [{ label: "Client logs", path: "~/Library/Logs/zoom.us/" }],
    types: ["pkg", "dmg", "x64", "arm64", "per-user"],
    scope: "per-user",
    added: "2026-08-25",
  },
  {
    id: "firefox-win",
    app: "Mozilla Firefox",
    vendor: "Mozilla",
    aliases: ["firefox", "ff"],
    platform: "windows",
    paths: [
      { label: "Profile folder", path: "%APPDATA%\\Mozilla\\Firefox\\Profiles\\<profile>\\" },
      { label: "Crash reports", path: "%APPDATA%\\Mozilla\\Firefox\\Crash Reports\\" },
      { label: "HTTP log", path: "%TEMP%\\log.txt", note: "Enabled from about:logging" },
    ],
    types: ["msi", "exe", "x86", "x64", "per-user", "per-machine"],
    scope: "per-user",
    added: "2026-08-08",
  },
  {
    id: "firefox-linux",
    app: "Mozilla Firefox",
    vendor: "Mozilla",
    aliases: ["firefox"],
    platform: "linux",
    paths: [
      { label: "Profile folder", path: "~/.mozilla/firefox/<profile>/" },
      { label: "Crash reports", path: "~/.mozilla/firefox/Crash Reports/" },
    ],
    types: ["deb", "rpm", "snap", "flatpak", "x64", "per-machine"],
    scope: "per-user",
    added: "2026-08-08",
  },
  {
    id: "jamf-mac",
    app: "Jamf Pro Agent",
    vendor: "Jamf",
    aliases: ["jamf", "jamf pro", "casper"],
    platform: "macos",
    paths: [
      { label: "Agent log", path: "/var/log/jamf.log" },
      { label: "Self Service log", path: "~/Library/Logs/JAMF/" },
    ],
    types: ["pkg", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-09-06",
  },
  {
    id: "macos-installer",
    app: "macOS Installer",
    vendor: "Apple",
    aliases: ["installer", "install.log", "pkg"],
    platform: "macos",
    paths: [
      { label: "Install log", path: "/var/log/install.log" },
      { label: "System log stream", path: "log show --predicate 'process == \"installd\"' --last 1h" },
    ],
    types: ["pkg", "dmg", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-08-31",
  },
  {
    id: "munki-mac",
    app: "Munki",
    vendor: "Munki Project",
    aliases: ["munki", "managedsoftwareupdate"],
    platform: "macos",
    paths: [
      { label: "Managed installs log", path: "/Library/Managed Installs/Logs/ManagedSoftwareUpdate.log" },
      { label: "Install history", path: "/Library/Managed Installs/InstallInfo.plist" },
    ],
    types: ["pkg", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-08-17",
  },
  {
    id: "homebrew-mac",
    app: "Homebrew",
    vendor: "Homebrew",
    aliases: ["brew", "homebrew"],
    platform: "macos",
    paths: [{ label: "Build logs", path: "~/Library/Logs/Homebrew/<formula>/" }],
    types: ["x64", "arm64", "per-user"],
    scope: "per-user",
    added: "2026-08-05",
  },
  {
    id: "nginx-linux",
    app: "nginx",
    vendor: "F5 / nginx",
    aliases: ["nginx"],
    platform: "linux",
    paths: [
      { label: "Access log", path: "/var/log/nginx/access.log" },
      { label: "Error log", path: "/var/log/nginx/error.log" },
    ],
    types: ["deb", "rpm", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-09-04",
  },
  {
    id: "apache-linux",
    app: "Apache HTTP Server",
    vendor: "Apache Foundation",
    aliases: ["apache", "httpd", "apache2"],
    platform: "linux",
    paths: [
      { label: "Debian / Ubuntu", path: "/var/log/apache2/error.log" },
      { label: "RHEL / Fedora", path: "/var/log/httpd/error_log" },
    ],
    types: ["deb", "rpm", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-09-04",
  },
  {
    id: "postgres-linux",
    app: "PostgreSQL",
    vendor: "PostgreSQL Global Development Group",
    aliases: ["postgres", "postgresql", "psql"],
    platform: "linux",
    paths: [
      { label: "Debian / Ubuntu", path: "/var/log/postgresql/postgresql-<version>-main.log" },
      { label: "Data directory", path: "/var/lib/pgsql/data/log/" },
    ],
    types: ["deb", "rpm", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-08-21",
  },
  {
    id: "apt-linux",
    app: "APT",
    vendor: "Debian",
    aliases: ["apt", "apt-get", "dpkg"],
    platform: "linux",
    paths: [
      { label: "Transaction history", path: "/var/log/apt/history.log" },
      { label: "Terminal capture", path: "/var/log/apt/term.log" },
      { label: "Package operations", path: "/var/log/dpkg.log" },
    ],
    types: ["deb", "x86", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-08-15",
  },
  {
    id: "dnf-linux",
    app: "DNF",
    vendor: "Fedora / Red Hat",
    aliases: ["dnf", "yum"],
    platform: "linux",
    paths: [
      { label: "Transaction log", path: "/var/log/dnf.log" },
      { label: "RPM transactions", path: "/var/log/dnf.rpm.log" },
    ],
    types: ["rpm", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-08-15",
  },
  {
    id: "sshd-linux",
    app: "OpenSSH Server",
    vendor: "OpenBSD",
    aliases: ["sshd", "ssh", "openssh"],
    platform: "linux",
    paths: [
      { label: "Debian / Ubuntu", path: "/var/log/auth.log" },
      { label: "RHEL / Fedora", path: "/var/log/secure" },
      { label: "systemd journal", path: "journalctl -u sshd" },
    ],
    types: ["deb", "rpm", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-08-12",
  },
  {
    id: "citrix-win",
    app: "Citrix Workspace App",
    vendor: "Citrix",
    aliases: ["citrix", "receiver", "workspace app", "cwa"],
    platform: "windows",
    paths: [
      { label: "Client logs", path: "%LOCALAPPDATA%\\Citrix\\CitrixWorkspaceApp\\Logs\\" },
      { label: "Install log", path: "%TEMP%\\CTXReceiverInstallLogs\\" },
    ],
    types: ["exe", "msi", "x86", "x64", "per-user", "per-machine"],
    scope: "per-user",
    added: "2026-09-09",
  },
  {
    id: "chocolatey-win",
    app: "Chocolatey",
    vendor: "Chocolatey Software",
    aliases: ["choco", "chocolatey"],
    platform: "windows",
    paths: [
      { label: "Package log", path: "C:\\ProgramData\\chocolatey\\logs\\chocolatey.log" },
      { label: "Install failures", path: "C:\\ProgramData\\chocolatey\\logs\\choco.summary.log" },
    ],
    types: ["exe", "x86", "x64", "per-machine"],
    scope: "per-machine",
    added: "2026-08-26",
  },
  {
    id: "adobe-acrobat-win",
    app: "Adobe Acrobat",
    vendor: "Adobe",
    aliases: ["acrobat", "adobe reader", "acrobat dc"],
    platform: "windows",
    paths: [
      { label: "Application logs", path: "%LOCALAPPDATA%\\Adobe\\Acrobat\\DC\\" },
      { label: "Installer logs", path: "%TEMP%\\Acrobat*.log" },
    ],
    types: ["msi", "exe", "x86", "x64", "per-machine"],
    scope: "per-machine",
    added: "2026-08-07",
  },
  {
    id: "npm-win",
    app: "npm",
    vendor: "npm, Inc.",
    aliases: ["npm", "node package manager"],
    platform: "windows",
    paths: [{ label: "Debug logs", path: "%LOCALAPPDATA%\\npm-cache\\_logs\\" }],
    types: ["msi", "x64", "arm64", "per-machine"],
    scope: "per-user",
    added: "2026-08-03",
  },
  {
    id: "npm-linux",
    app: "npm",
    vendor: "npm, Inc.",
    aliases: ["npm"],
    platform: "linux",
    paths: [{ label: "Debug logs", path: "${XDG_CACHE_HOME:-~/.cache}/npm/_logs/" }],
    types: ["deb", "rpm", "snap", "x64", "arm64", "per-machine"],
    scope: "per-user",
    added: "2026-08-03",
  },
  {
    id: "systemd-linux",
    app: "systemd journal",
    vendor: "systemd",
    aliases: ["journalctl", "systemd", "journal"],
    platform: "linux",
    paths: [
      { label: "Persistent journal", path: "/var/log/journal/" },
      { label: "Volatile journal", path: "/run/log/journal/" },
      { label: "Per-unit read", path: "journalctl -u <unit> --since today" },
    ],
    types: ["deb", "rpm", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-09-10",
  },
  {
    id: "cloudinit-linux",
    app: "cloud-init",
    vendor: "Canonical",
    aliases: ["cloud-init", "cloudinit"],
    platform: "linux",
    paths: [
      { label: "Main log", path: "/var/log/cloud-init.log" },
      { label: "Boot output", path: "/var/log/cloud-init-output.log" },
    ],
    types: ["deb", "rpm", "x64", "arm64", "system"],
    scope: "system",
    added: "2026-09-10",
  },
  {
    id: "dropbox-win",
    app: "Dropbox",
    vendor: "Dropbox",
    aliases: ["dropbox"],
    platform: "windows",
    paths: [{ label: "Client logs", path: "%LOCALAPPDATA%\\Dropbox\\logs\\" }],
    types: ["exe", "msi", "x64", "per-user"],
    scope: "per-user",
    added: "2026-07-29",
  },
  {
    id: "steam-win",
    app: "Steam",
    vendor: "Valve",
    aliases: ["steam"],
    platform: "windows",
    paths: [
      { label: "Client logs", path: "C:\\Program Files (x86)\\Steam\\logs\\" },
      { label: "Content log", path: "C:\\Program Files (x86)\\Steam\\logs\\content_log.txt" },
    ],
    types: ["exe", "x86", "x64", "per-machine"],
    scope: "per-machine",
    added: "2026-07-24",
  },
];

/** Newest first, for the recent-additions rack. */
export function recentAdditions(limit = 6): Entry[] {
  return [...ENTRIES].sort((a, b) => b.added.localeCompare(a.added)).slice(0, limit);
}

export function totalEntries(): number {
  return ENTRIES.length;
}

export type SearchArgs = {
  q: string;
  platform?: Platform | "all";
  types?: string[];
  limit?: number;
};

type Scored = { entry: Entry; score: number };

function scoreEntry(entry: Entry, q: string): number {
  const needle = q.trim().toLowerCase();
  if (!needle) return 0;

  const app = entry.app.toLowerCase();
  const haystacks = [app, ...entry.aliases.map((a) => a.toLowerCase())];

  let best = 0;
  for (const hay of haystacks) {
    if (hay === needle) best = Math.max(best, 100);
    else if (hay.startsWith(needle)) best = Math.max(best, 80 - (hay.length - needle.length) * 0.2);
    else if (hay.includes(needle)) best = Math.max(best, 55);
    else if (hay.split(/[\s-]+/).some((w) => w.startsWith(needle))) best = Math.max(best, 65);
  }

  if (!best && entry.vendor.toLowerCase().includes(needle)) best = 30;
  if (!best && entry.paths.some((p) => p.path.toLowerCase().includes(needle))) best = 20;

  return best;
}

/**
 * The single query seam. Swap the body for a DB call; keep the shape.
 */
export function searchCatalog({ q, platform = "all", types = [], limit }: SearchArgs): Entry[] {
  const pool = ENTRIES.filter((e) => {
    if (platform !== "all" && e.platform !== platform) return false;
    if (types.length && !types.every((t) => e.types.includes(t))) return false;
    return true;
  });

  if (!q.trim()) {
    const sorted = [...pool].sort((a, b) => a.app.localeCompare(b.app));
    return limit ? sorted.slice(0, limit) : sorted;
  }

  const scored: Scored[] = pool
    .map((entry) => ({ entry, score: scoreEntry(entry, q) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.app.localeCompare(b.entry.app));

  const out = scored.map((s) => s.entry);
  return limit ? out.slice(0, limit) : out;
}

/** Type tags actually present in a result set, for the results-page filter rail. */
export function availableTypes(entries: Entry[]): string[] {
  const seen = new Set<string>();
  entries.forEach((e) => e.types.forEach((t) => seen.add(t)));
  const order = TYPE_GROUPS.flatMap((g) => g.types);
  return [...seen].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}
