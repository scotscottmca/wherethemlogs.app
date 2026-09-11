/**
 * Shared view types and the browser's API client.
 *
 * Record shapes come straight from `lib/model.ts`, which the route handlers
 * use too - one definition, checked by the compiler. That seam used to be a
 * hand-maintained contract across an HTTP boundary between two deployables;
 * it is not one any more.
 */
import type { LogPath, Platform, ResolvedApp, Scope } from "./model";
import { PLATFORMS } from "./model";

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
 * One plate per app per platform per variant.
 *
 * A label plate's zone band names one platform and its header names one
 * shipping flavour, so Microsoft Teams racks as four plates: New Teams and
 * Classic, on Windows and on macOS. Splitting on variant as well as platform is
 * what keeps the header honest - a plate stamped "Classic (v1)" lists only
 * Classic paths. The split is presentation; the record underneath is one app
 * with many log paths.
 */
export interface Plate {
  key: string;
  app: PlateApp;
  platform: Platform;
  variant?: string;
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
      const byVariant = new Map<string, LogPath[]>();
      for (const logPath of onPlatform) {
        const key = logPath.variant ?? "";
        const bucket = byVariant.get(key);
        if (bucket) bucket.push(logPath);
        else byVariant.set(key, [logPath]);
      }

      // Trimmed once per app, not once per plate - the card's-eye view of it.
      const plateApp: PlateApp = {
        name: app.name,
        slug: app.slug,
        resolvedIconUrl: app.resolvedIconUrl,
        vendor: { name: app.vendor.name },
      };

      for (const [variant, logPaths] of byVariant) {
        out.push({
          key: `${app.id}:${platform}:${variant}`,
          app: plateApp,
          platform,
          ...(variant ? { variant } : {}),
          logPaths,
        });
      }
    }
  }

  return out;
}
