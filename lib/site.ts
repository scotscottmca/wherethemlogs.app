/**
 * The repository every GitHub link derives from: the request button, the
 * per-plate "wrong path" affordance, and the footer.
 */
export const GITHUB_REPO = "https://github.com/scotscottmca/wherethemlogs.app";

export const GITHUB_ISSUES = `${GITHUB_REPO}/issues`;

export function requestAppUrl(app?: string) {
  const title = app ? `Add: ${app}` : "Add an application";
  const body = [
    "**Application**",
    app ?? "",
    "",
    "**Platform(s)**",
    "Windows / macOS / Linux",
    "",
    "**Installer type(s)**",
    "MSI / EXE / MSIX / PKG / DMG / DEB / RPM — and x86 / x64 / arm64",
    "",
    "**Log path(s)**",
    "Paste the exact path, environment variables intact.",
    "",
    "**How you verified it**",
    "",
  ].join("\n");
  return `${GITHUB_ISSUES}/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

export function correctionUrl(app: string, platform: string) {
  const title = `Correction: ${app} (${platform})`;
  return `${GITHUB_ISSUES}/new?title=${encodeURIComponent(title)}`;
}

export const RECENT_KEY = "wtla.recent";
export const CONSENT_KEY = "wtla.consent";
