/**
 * Requests and corrections are issues on the site's own public repository.
 * Visitors file them through the on-site forms (/request), which open the
 * issue for them; the GitHub forms are the fallback.
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

/** The GitHub form for a new application: the fallback when the on-site form is off. */
export function githubRequestUrl(app?: string) {
  return issueUrl("add-application.yml", {
    title: app ? `Add: ${app}` : undefined,
    app,
  });
}

const PLATFORM_LABEL: Record<string, string> = {
  WIN: "Windows",
  MAC: "macOS",
  LNX: "Linux",
};

/** The GitHub form for a correction: the fallback when the on-site form is off. */
export function githubCorrectionUrl(app?: string, platform?: string) {
  return issueUrl("correct-a-path.yml", {
    title: app ? `Correction: ${app}${platform ? ` (${platform})` : ""}` : undefined,
    app,
    // Must match the dropdown's option text exactly or the prefill is dropped.
    platform,
  });
}

/**
 * Every "Request an app" link. The on-site form files the GitHub issue for the
 * visitor, so no GitHub account is needed.
 */
export function requestAppUrl(app?: string) {
  return app ? `/request?${new URLSearchParams({ app })}` : "/request";
}

/** Every "Wrong path?" link. `platform` is the zone code a plate carries (WIN, MAC, LNX). */
export function correctionUrl(app: string, platform: string) {
  const params = new URLSearchParams({ app });
  if (PLATFORM_LABEL[platform]) params.set("platform", PLATFORM_LABEL[platform]);
  return `/request/correction?${params}`;
}

export const RECENT_KEY = "wtla.recent";
export const CONSENT_KEY = "wtla.consent";
/** Fired on window when the visitor answers, so analytics can load without a reload. */
export const CONSENT_EVENT = "wtla:consent";
/** "off" when the visitor has switched the "/" search shortcut off. */
export const SLASH_KEY = "wtla.slash";
export const GA_ID = "G-CG11KY5XE3";

/**
 * The single source of truth for the privacy page's "Last updated" date. The
 * page text and the sitemap's <lastmod> for /privacy both read this, so they
 * cannot drift apart. Update this when the privacy page content changes.
 */
export const PRIVACY_LAST_UPDATED = new Date("2026-10-06T00:00:00.000Z");

/** Renders a Date as "11 September 2026", independent of server locale/timezone. */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
