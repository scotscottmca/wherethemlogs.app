import { apps, vendors } from "./cosmos";
import { resolveApp, type App, type Platform, type ResolvedApp, type Vendor } from "./model";

/**
 * The catalogue is small, read constantly and written rarely, so the whole of
 * it is held in the instance for a short window. Search then costs no RU at
 * all, and a write is visible everywhere within the TTL.
 *
 * `ponytail: process-local cache, no cross-instance invalidation. If editors
 * need writes to appear instantly on every instance, put Cosmos change feed
 * behind an event and drop the TTL — not before.`
 */
const TTL_MS = 60_000;

interface Snapshot {
  vendors: Map<string, Vendor>;
  apps: App[];
  loadedAt: number;
}

let snapshot: Snapshot | undefined;
let inFlight: Promise<Snapshot> | undefined;

async function load(): Promise<Snapshot> {
  const [vendorRows, appRows] = await Promise.all([
    vendors().items.readAll<Vendor>().fetchAll(),
    apps().items.readAll<App>().fetchAll(),
  ]);

  return {
    vendors: new Map(vendorRows.resources.map((v) => [v.id, v])),
    apps: appRows.resources,
    loadedAt: Date.now(),
  };
}

export async function getSnapshot(): Promise<Snapshot> {
  if (snapshot && Date.now() - snapshot.loadedAt < TTL_MS) return snapshot;
  // Collapse a thundering herd on a cold instance into one read.
  inFlight ??= load().finally(() => {
    inFlight = undefined;
  });
  snapshot = await inFlight;
  return snapshot;
}

/** Call after any write so the next read sees it on this instance. */
export function invalidate(): void {
  snapshot = undefined;
}

export interface SearchArgs {
  q: string;
  platform: Platform | "all";
  types: string[];
  limit?: number;
}

function score(app: App, needle: string): number {
  const haystacks = [app.name.toLowerCase(), ...app.aliases.map((a) => a.toLowerCase())];

  let best = 0;
  for (const hay of haystacks) {
    if (hay === needle) best = Math.max(best, 100);
    else if (hay.startsWith(needle)) best = Math.max(best, 80 - (hay.length - needle.length) * 0.2);
    else if (hay.split(/[\s-]+/).some((w) => w.startsWith(needle))) best = Math.max(best, 65);
    else if (hay.includes(needle)) best = Math.max(best, 55);
  }
  return best;
}

export interface SearchResult {
  results: ResolvedApp[];
  /** Matches before platform and type filters were applied. */
  matched: number;
}

export async function search({ q, platform, types, limit }: SearchArgs): Promise<SearchResult> {
  const { vendors: vendorMap, apps: allApps } = await getSnapshot();
  const needle = q.trim().toLowerCase();

  let pool = allApps;
  if (needle) {
    pool = allApps
      .map((app) => ({ app, s: score(app, needle) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.app.name.localeCompare(b.app.name))
      .map((x) => x.app);
  } else {
    pool = [...allApps].sort((a, b) => a.name.localeCompare(b.name));
  }

  const matched = pool.length;

  // Filters narrow the log paths as well as the apps: asking for Windows + msi
  // should not return an app's macOS paths alongside.
  const filtered: ResolvedApp[] = [];
  for (const app of pool) {
    const logPaths = app.logPaths.filter((p) => {
      if (platform !== "all" && p.platform !== platform) return false;
      if (types.length && !types.every((t) => p.types.includes(t))) return false;
      return true;
    });
    if (!logPaths.length) continue;
    filtered.push(resolveApp({ ...app, logPaths }, vendorMap.get(app.vendorId)));
  }

  return {
    results: limit ? filtered.slice(0, limit) : filtered,
    matched,
  };
}

export async function summary() {
  const { vendors: vendorMap, apps: allApps } = await getSnapshot();

  const byPlatform: Record<Platform, number> = { windows: 0, macos: 0, linux: 0 };
  let logPathCount = 0;
  for (const app of allApps) {
    logPathCount += app.logPaths.length;
    for (const platform of new Set(app.logPaths.map((p) => p.platform))) {
      byPlatform[platform] += 1;
    }
  }

  const recent = [...allApps]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6)
    .map((app) => resolveApp(app, vendorMap.get(app.vendorId)));

  return {
    apps: allApps.length,
    vendors: vendorMap.size,
    logPaths: logPathCount,
    byPlatform,
    recent,
  };
}
