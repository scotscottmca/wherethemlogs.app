/**
 * The code lives in one repository and requests live in another.
 *
 * The tracker is public so anyone can ask for an application or flag a wrong
 * path without access to the source. Every "request" and "wrong path" link on
 * the site points there, not at the code.
 */
export const GITHUB_ISSUES_REPO = "https://github.com/scotscottmca/wherethemlogs.app-issues";

export const GITHUB_ISSUES = `${GITHUB_ISSUES_REPO}/issues`;

/**
 * The tracker uses GitHub issue forms, so prefilled values are keyed by each
 * field's `id` in .github/ISSUE_TEMPLATE/*.yml - not by a `body` blob. Change a
 * field id there and the prefill here goes silently ignored, which is the one
 * sharp edge of forms over markdown templates.
 */
function issueUrl(template: string, fields: Record<string, string | undefined>) {
  const params = new URLSearchParams({ template });
  for (const [key, value] of Object.entries(fields)) {
    if (value) params.set(key, value);
  }
  return `${GITHUB_ISSUES}/new?${params.toString()}`;
}

export function requestAppUrl(app?: string) {
  return issueUrl("add-application.yml", {
    title: app ? `Add: ${app}` : undefined,
    app,
  });
}

export function correctionUrl(app: string, platform: string) {
  const PLATFORM_LABEL: Record<string, string> = {
    WIN: "Windows",
    MAC: "macOS",
    LNX: "Linux",
  };

  return issueUrl("correct-a-path.yml", {
    title: `Correction: ${app} (${platform})`,
    app,
    // Must match the dropdown's option text exactly or the prefill is dropped.
    platform: PLATFORM_LABEL[platform],
  });
}

export const RECENT_KEY = "wtla.recent";
export const CONSENT_KEY = "wtla.consent";
