/**
 * The on-site request forms, and the GitHub issue each one becomes.
 *
 * An issue is written in exactly the markdown GitHub renders for the issue
 * forms in .github/ISSUE_TEMPLATE: one "### Label" heading per field, the
 * answer under it, "_No response_" for a blank one and "- [X] option" for a
 * ticked box. That is what .github/scripts/issue-to-import.cjs reads, so an
 * issue filed here gets the same import-file comment as one filed on GitHub.
 * Change a label in the YAML and it has to change here too.
 *
 * Every free-text answer goes inside a ```text fence. The parser strips the
 * fence, and GitHub renders nothing inside one: no @mention notifies anyone,
 * no link or image appears. That is the line between a visitor's text and a
 * public issue filed under the site's name.
 */

export const PLATFORM_FIELDS = [
  { id: "windows", name: "Windows", installers: ["msi", "exe", "msix", "appx"] },
  { id: "macos", name: "macOS", installers: ["pkg", "dmg", "mas"] },
  { id: "linux", name: "Linux", installers: ["deb", "rpm", "snap", "flatpak", "appimage"] },
] as const;

export type PlatformId = (typeof PLATFORM_FIELDS)[number]["id"];

export const ARCHITECTURES = ["x86", "x64", "arm64"] as const;
export const SCOPES = ["per-user", "per-machine", "system"] as const;

export const PLATFORM_NAMES = ["Windows", "macOS", "Linux"] as const;

export const CORRECTION_KINDS = [
  "The path is incorrect",
  "The path moved in a newer version",
  "The qualifiers are wrong (installer type, architecture or scope)",
  "A variant is missing",
  "The entry is a duplicate",
  "Something else",
] as const;

export const REDACTION_PLEDGE =
  "I have redacted hostnames, usernames, tenant identifiers and customer names.";

/** Optional, published on the issue so the person who reported it gets the credit. */
export interface Credit {
  /** A GitHub username, linked to the profile rather than @mentioned. */
  github?: string;
  /** A LinkedIn profile URL. */
  linkedin?: string;
  /** An X or Bluesky handle. */
  social?: string;
}

export interface AddRequest {
  kind: "add";
  app: string;
  vendor: string;
  aliases?: string;
  variant?: string;
  version?: string;
  /** One path per line, optionally followed by " | what it holds". */
  paths: Partial<Record<PlatformId, string>>;
  installers: Partial<Record<PlatformId, string[]>>;
  architectures: string[];
  scope?: string;
  verification: string;
  notes?: string;
  credit: Credit;
}

export interface CorrectionRequest {
  kind: "correction";
  app: string;
  platform: string;
  listed: string;
  problem: string;
  correct: string;
  verification: string;
  credit: Credit;
}

export type SiteRequest = AddRequest | CorrectionRequest;

export const LIMITS = {
  name: 160,
  aliases: 300,
  variant: 80,
  version: 80,
  paths: 4000,
  prose: 2000,
  github: 39,
  linkedin: 200,
  social: 100,
} as const;

const fenced = (value?: string) => (value?.trim() ? "```text\n" + value.trim() + "\n```" : "_No response_");

const plain = (value?: string) => (value?.trim() ? value.trim() : "_No response_");

const boxes = (options: readonly string[], ticked: readonly string[]) =>
  options.map((o) => `- [${ticked.includes(o) ? "X" : " "}] ${o}`).join("\n");

const section = (label: string, answer: string) => `### ${label}\n\n${answer}`;

function creditLines(credit: Credit): string {
  const lines = [
    credit.github && `- GitHub: [${credit.github}](https://github.com/${credit.github})`,
    credit.linkedin && `- LinkedIn: <${credit.linkedin}>`,
    credit.social && `- X or Bluesky: \`${credit.social}\``,
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "_No response_";
}

const footer = (credit: Credit) =>
  [section("Credit", creditLines(credit)), "---", "_Submitted through https://wherethemlogs.app/request_"];

export function issueFor(request: SiteRequest): { title: string; body: string; labels: string[] } {
  if (request.kind === "correction") {
    return {
      title: `Correction: ${request.app} (${request.platform})`,
      labels: ["correction"],
      body: [
        section("Application", fenced(request.app)),
        section("Platform", plain(request.platform)),
        section("What the index currently says", fenced(request.listed)),
        section("What is wrong with it", plain(request.problem)),
        section("What it should say", fenced(request.correct)),
        section("How did you verify this?", fenced(request.verification)),
        section("Before you submit", boxes([REDACTION_PLEDGE], [REDACTION_PLEDGE])),
        ...footer(request.credit),
      ].join("\n\n"),
    };
  }

  const platforms = PLATFORM_FIELDS.flatMap((p) => [
    section(`${p.name} log paths`, fenced(request.paths[p.id])),
    section(`${p.name} installer type`, boxes(p.installers, request.installers[p.id] ?? [])),
  ]);
  return {
    title: `Add: ${request.app}`,
    labels: ["addition"],
    body: [
      section("Application", fenced(request.app)),
      section("Vendor", fenced(request.vendor)),
      section("Also known as", fenced(request.aliases)),
      section("Variant", fenced(request.variant)),
      section("Version", fenced(request.version)),
      ...platforms,
      section(
        "Architecture",
        boxes([...ARCHITECTURES, "Not sure"], request.architectures.length ? request.architectures : ["Not sure"]),
      ),
      section("Scope", boxes([...SCOPES, "Not sure"], [request.scope ?? "Not sure"])),
      section("How did you verify this?", fenced(request.verification)),
      section("Anything else", fenced(request.notes)),
      section("Before you submit", boxes([REDACTION_PLEDGE], [REDACTION_PLEDGE])),
      ...footer(request.credit),
    ].join("\n\n"),
  };
}
