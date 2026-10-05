/**
 * Requests and corrections are issues on the site's own public repository.
 * Every "request" and "wrong path" link on the site points at its tracker.
 */
export const GITHUB_ISSUES_REPO = "https://github.com/scotscottmca/wherethemlogs.app";

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
/** Fired on window when the visitor answers, so analytics can load without a reload. */
export const CONSENT_EVENT = "wtla:consent";
export const GA_ID = "G-CG11KY5XE3";

/**
 * The single source of truth for the privacy page's "Last updated" date. The
 * page text and the sitemap's <lastmod> for /privacy both read this, so they
 * cannot drift apart. Update this when the privacy page content changes.
 */
export const PRIVACY_LAST_UPDATED = new Date("2026-09-11T00:00:00.000Z");

/** Renders a Date as "11 September 2026", independent of server locale/timezone. */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
