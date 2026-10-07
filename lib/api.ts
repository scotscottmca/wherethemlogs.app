/**
 * Shared view types and the browser's API client.
 *
 * Record shapes come straight from `lib/model.ts`, which the route handlers
 * use too - one definition, checked by the compiler. That seam used to be a
 * hand-maintained contract across an HTTP boundary between two deployables;
 * it is not one any more.
 */
import type { LogPath, Platform, ResolvedApp, Scope } from "./model";
import { INSTALLER_TYPES, PLATFORMS, pathLines } from "./model";

export type { LogPath, Platform, ResolvedApp, Scope };
export { PLATFORMS };

export const PLATFORM_META: { id: Platform; code: string; name: string }[] = [
  { id: "windows", code: "WIN", name: "Windows" },
  { id: "macos", code: "MAC", name: "macOS" },
  { id: "linux", code: "LNX", name: "Linux" },
];

export const TYPE_GROUPS: { label: string; types: string[] }[] = [
  {
    label: "Installer",
    types: ["msi", "exe", "msix", "appx", "pkg", "dmg", "mas", "deb", "rpm", "snap", "flatpak", "appimage"],
  },
  { label: "Architecture", types: ["x86", "x64", "arm64"] },
];

export interface SearchResponse {
  query: string;
  platform: Platform | "all";
  types: string[];
  count: number;
  matched: number;
  results: ResolvedApp[];
}

export interface SummaryResponse {
  apps: number;
  vendors: number;
  logPaths: number;
  byPlatform: Record<Platform, number>;
  recent: ResolvedApp[];
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Only the browser uses this. Server components call `search()` and `summary()`
 * in `lib/server/catalog.ts` directly - no HTTP hop to reach our own process.
 */
export async function searchApps(
  args: { q: string; platform: Platform | "all"; types?: string[]; limit?: number },
  init?: RequestInit,
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (args.q) params.set("q", args.q);
  if (args.platform !== "all") params.set("platform", args.platform);
  (args.types ?? []).forEach((t) => params.append("type", t));
  if (args.limit) params.set("limit", String(args.limit));

  const qs = params.toString();
  const response = await fetch(`/api/search${qs ? `?${qs}` : ""}`, {
    ...init,
    headers: { accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.status >= 500
        ? "The catalogue is not answering. Try again in a moment."
        : `Request failed (${response.status}).`,
    );
  }
  return (await response.json()) as SearchResponse;
}

/**
 * Just what a plate prints about (and links to for) the app it belongs to -
 * not the whole resolved record. `Plate` is sent to the browser as client
 * component props (see `components/Plate.tsx`), so it must not carry fields
 * the card never renders: aliases, notes, documentation, timestamps, the
 * vendor's id and slug, or the app's log paths on other platforms. Those
 * already exist in `ResolvedApp` for anything that needs them.
 */
export interface PlateApp {
  name: string;
  slug: string;
  resolvedIconUrl: string | null;
  vendor: { name: string };
}

/**
 * One plate per app per platform per variant per version.
 *
 * A label plate's zone band names one platform and its header names one
 * shipping flavour, so Microsoft Teams racks as four plates: New Teams and
 * Classic, on Windows and on macOS. Splitting on variant as well as platform is
 * what keeps the header honest - a plate stamped "Classic (v1)" lists only
 * Classic paths. A version splits the same way: a path that moved in 4.0 racks
 * as one plate stamped "4.0 and later" and one stamped "up to 3.6", and the
 * paths that hold for every version stay on the unstamped plate. The split is
 * presentation; the record underneath is one app with many log paths.
 */
export interface Plate {
  key: string;
  app: PlateApp;
  platform: Platform;
  variant?: string;
  version?: string;
  logPaths: LogPath[];
}

export function toPlates(apps: ResolvedApp[]): Plate[] {
  const out: Plate[] = [];

  for (const app of apps) {
    for (const platform of PLATFORMS) {
      const onPlatform = app.logPaths.filter((p) => p.platform === platform);
      if (!onPlatform.length) continue;

      // Insertion order decides plate order, so the catalogue's own ordering
      // survives instead of being alphabetised into nonsense.
      const byStamp = new Map<string, LogPath[]>();
      for (const logPath of onPlatform) {
        const key = `${logPath.variant ?? ""}\n${logPath.version ?? ""}`;
        const bucket = byStamp.get(key);
        if (bucket) bucket.push(logPath);
        else byStamp.set(key, [logPath]);
      }

      // Trimmed once per app, not once per plate - the card's-eye view of it.
      const plateApp: PlateApp = {
        name: app.name,
        slug: app.slug,
        resolvedIconUrl: app.resolvedIconUrl,
        vendor: { name: app.vendor.name },
      };

      for (const [stamp, logPaths] of byStamp) {
        const [variant, version] = stamp.split("\n") as [string, string];
        out.push({
          key: `${app.id}:${platform}:${variant}:${version}`,
          app: plateApp,
          platform,
          ...(variant ? { variant } : {}),
          ...(version ? { version } : {}),
          logPaths,
        });
      }
    }
  }

  return out;
}

/**
 * One plain-language sentence per platform, derived from the record.
 *
 * The plates below are the authority; this is the same fact written as prose,
 * so someone skimming (or an answer engine quoting the page) gets the answer
 * without parsing a table. The first path on a platform wins the sentence -
 * that is the one the first plate prints, which is the catalogue's own order.
 */
export interface PlatformSummary {
  platform: Platform;
  name: string;
  /** Self-contained and quotable on its own: "X logs to Y on Windows." */
  answer: string;
  /** What qualifies that answer: the other paths, the installs it applies to. */
  detail: string;
}

export function platformSummaries(app: ResolvedApp): PlatformSummary[] {
  const summaries: PlatformSummary[] = [];

  for (const { id, name } of PLATFORM_META) {
    const onPlatform = app.logPaths.filter((p) => p.platform === id);
    if (!onPlatform.length) continue;

    // A label can carry several files under one path field; the sentence takes
    // the first line rather than printing a block of them mid-paragraph.
    const first = pathLines(onPlatform[0].path)[0] ?? onPlatform[0].path;
    const lineCount = onPlatform.reduce((n, p) => n + pathLines(p.path).length, 0);
    // Variants and versions read the same in the sentence: the flavours and
    // releases the other paths are for.
    const variants = [
      ...new Set(onPlatform.flatMap((p) => [...(p.variant ? [p.variant] : []), ...(p.version ? [p.version] : [])])),
    ];
    const installers = [
      ...new Set(onPlatform.flatMap((p) => p.types.filter((t) => INSTALLER_TYPE_SET.has(t)))),
    ];

    const detail: string[] = [];
    if (lineCount > 1) {
      const others = lineCount - 1;
      detail.push(
        `${others} other ${name} log ${others === 1 ? "location is" : "locations are"} recorded below${
          variants.length ? `, including paths for ${joinWords(variants)}` : ""
        }.`,
      );
    }
    if (installers.length) {
      detail.push(
        `These paths were verified for ${joinWords(installers)} installs - a different installer, or a portable copy, can put them somewhere else.`,
      );
    }

    summaries.push({
      platform: id,
      name,
      answer: `${app.name} logs to ${first} on ${name}.`,
      detail: detail.join(" "),
    });
  }

  return summaries;
}

/** Membership test for the installer half of a log path's `types`. */
export const INSTALLER_TYPE_SET = new Set<string>(INSTALLER_TYPES);

/** "a", "a and b", "a, b and c" - the way the copy reads it aloud. */
function joinWords(words: string[]): string {
  if (words.length < 2) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
