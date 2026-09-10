/**
 * The catalogue API client.
 *
 * In production the Static Web App proxies /api/* to the linked Function App,
 * so the browser talks to its own origin. For local development against a
 * running Functions host, set NEXT_PUBLIC_API_BASE (e.g. http://localhost:7071).
 */

export const PLATFORMS = ["windows", "macos", "linux"] as const;
export type Platform = (typeof PLATFORMS)[number];
export type Scope = "per-user" | "per-machine" | "system";

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

export interface LogPath {
  id: string;
  platform: Platform;
  label: string;
  path: string;
  note?: string;
  variant?: string;
  types: string[];
  scope: Scope;
}

export interface ResolvedApp {
  id: string;
  vendorId: string;
  slug: string;
  name: string;
  aliases: string[];
  iconUrl: string | null;
  resolvedIconUrl: string | null;
  vendor: { id: string; slug: string; name: string; iconUrl: string | null };
  logPaths: LogPath[];
  platforms: Platform[];
  types: string[];
  createdAt: string;
  updatedAt: string;
}

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

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: { accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const message =
      response.status >= 500
        ? "The catalogue is not answering. Try again in a moment."
        : `Request failed (${response.status}).`;
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

export function searchApps(
  args: { q: string; platform: Platform | "all"; types?: string[]; limit?: number },
  init?: RequestInit,
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (args.q) params.set("q", args.q);
  if (args.platform !== "all") params.set("platform", args.platform);
  (args.types ?? []).forEach((t) => params.append("type", t));
  if (args.limit) params.set("limit", String(args.limit));

  const qs = params.toString();
  return get<SearchResponse>(`/search${qs ? `?${qs}` : ""}`, init);
}

export function getSummary(init?: RequestInit): Promise<SummaryResponse> {
  return get<SummaryResponse>("/summary", init);
}

/**
 * One plate per app per platform per variant.
 *
 * A label plate's zone band names one platform and its header names one
 * shipping flavour, so Microsoft Teams racks as four plates: New Teams and
 * Classic, on Windows and on macOS. Splitting on variant as well as platform is
 * what keeps the header honest — a plate stamped "Classic (v1)" lists only
 * Classic paths. The split is presentation; the record underneath is one app
 * with many log paths.
 */
export interface Plate {
  key: string;
  app: ResolvedApp;
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

      for (const [variant, logPaths] of byVariant) {
        out.push({
          key: `${app.id}:${platform}:${variant}`,
          app,
          platform,
          ...(variant ? { variant } : {}),
          logPaths,
        });
      }
    }
  }

  return out;
}
