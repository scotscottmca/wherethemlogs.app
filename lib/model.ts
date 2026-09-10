/**
 * The catalogue's shape.
 *
 * Vendor > App > LogPath. A vendor has many apps; an app has many log paths.
 * Log paths are embedded on the app document rather than living in their own
 * container: they are always read with the app, always written with the app,
 * and there are a handful of them per app. Vendors are referenced, not
 * embedded, because a vendor's name and icon are shared by every app it owns.
 */

export const PLATFORMS = ["windows", "macos", "linux"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const SCOPES = ["per-user", "per-machine", "system"] as const;
export type Scope = (typeof SCOPES)[number];

/** Installer flavours and architectures a path is qualified by. */
export const INSTALLER_TYPES = [
  "msi", "exe", "msix", "appx", "pkg", "dmg", "mas", "deb", "rpm", "snap", "flatpak", "appimage",
] as const;
export const ARCHITECTURES = ["x86", "x64", "arm64"] as const;
export const ALL_TYPES = [...INSTALLER_TYPES, ...ARCHITECTURES] as const;
export type QualifierType = (typeof ALL_TYPES)[number];

export interface Vendor {
  id: string;
  /** URL-safe, unique across vendors. */
  slug: string;
  name: string;
  /** Absolute URL in the icons container. Null means no icon has been uploaded. */
  iconUrl: string | null;
  website?: string;
  createdAt: string;
  updatedAt: string;
  /** Cosmos optimistic concurrency token. Returned on reads, required on writes. */
  _etag?: string;
}

export interface LogPath {
  id: string;
  platform: Platform;
  /** What this file is, e.g. "Client logs". */
  label: string;
  /** Verbatim. Environment variables are never expanded. */
  path: string;
  note?: string;
  /** Distinguishes shipping flavours, e.g. "Classic (v1)". */
  variant?: string;
  types: string[];
  scope: Scope;
}

export interface App {
  id: string;
  /** Partition key. Every app for one vendor lives in one partition. */
  vendorId: string;
  slug: string;
  name: string;
  aliases: string[];
  /** Null means "inherit the vendor's icon" - resolved on read, never stored resolved. */
  iconUrl: string | null;
  logPaths: LogPath[];
  createdAt: string;
  updatedAt: string;
  _etag?: string;
}

/** What the public API returns: an app with its vendor and icon already resolved. */
export interface ResolvedApp extends Omit<App, "_etag"> {
  vendor: { id: string; slug: string; name: string; iconUrl: string | null };
  /** app.iconUrl, falling back to the vendor's. */
  resolvedIconUrl: string | null;
  /** Distinct platforms across this app's log paths, for filtering and display. */
  platforms: Platform[];
  /** Distinct qualifier types across this app's log paths. */
  types: string[];
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function resolveApp(app: App, vendor: Vendor | undefined): ResolvedApp {
  const platforms = [...new Set(app.logPaths.map((p) => p.platform))] as Platform[];
  const types = [...new Set(app.logPaths.flatMap((p) => p.types))];
  return {
    ...app,
    _etag: undefined,
    vendor: {
      id: vendor?.id ?? app.vendorId,
      slug: vendor?.slug ?? "unknown",
      name: vendor?.name ?? "Unknown vendor",
      iconUrl: vendor?.iconUrl ?? null,
    },
    resolvedIconUrl: app.iconUrl ?? vendor?.iconUrl ?? null,
    platforms,
    types,
  } as ResolvedApp;
}
