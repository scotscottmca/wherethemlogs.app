import { headers } from "next/headers";
import { getSnapshot } from "./catalog";
import { requireAdmin, type ClientPrincipal } from "./auth";
import type { App, Vendor } from "../model";
import type { StockRow } from "../admin";

export type { StockRow };

/**
 * What the admin pages read.
 *
 * These go through the same process snapshot the public site uses rather than
 * querying Cosmos again. Three reasons: every admin write calls `invalidate()`,
 * so a curator's own edit is visible on the next render; the snapshot's rows
 * come from `readAll`, so they carry the `_etag` the editors need for
 * `If-Match`; and it is one read for the whole catalogue instead of one per
 * page.
 *
 * `ponytail: a colleague writing on another replica can hand this instance a
 * stale _etag for up to the snapshot TTL. That surfaces as the 412 recovery the
 * editors already draw, not as a silent clobber. Tighten it with a change feed
 * only if two curators ever actually collide.`
 */

export interface AisleVendor extends Vendor {
  appCount: number;
  logPathCount: number;
}

function countsFor(vendorId: string, apps: App[]) {
  const owned = apps.filter((a) => a.vendorId === vendorId);
  return {
    appCount: owned.length,
    logPathCount: owned.reduce((n, a) => n + a.logPaths.length, 0),
  };
}

/** Every vendor, by name, with what each one holds. */
export async function aisle(): Promise<AisleVendor[]> {
  const { vendors, apps } = await getSnapshot();
  return [...vendors.values()]
    .map((v) => ({ ...v, ...countsFor(v.id, apps) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Every app, flattened for the stock filter. */
export async function stock(): Promise<StockRow[]> {
  const { vendors, apps } = await getSnapshot();
  return apps
    .map((a) => ({
      id: a.id,
      vendorId: a.vendorId,
      vendorName: vendors.get(a.vendorId)?.name ?? "Unknown vendor",
      name: a.name,
      slug: a.slug,
      aliases: a.aliases,
      platforms: [...new Set(a.logPaths.map((p) => p.platform))],
      logPathCount: a.logPaths.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function vendorRecord(
  id: string,
): Promise<{ vendor: Vendor; apps: App[] } | null> {
  const { vendors, apps } = await getSnapshot();
  const vendor = vendors.get(id);
  if (!vendor) return null;
  return {
    vendor,
    apps: apps.filter((a) => a.vendorId === id).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function appRecord(
  vendorId: string,
  appId: string,
): Promise<{ vendor: Vendor; app: App } | null> {
  const { vendors, apps } = await getSnapshot();
  const vendor = vendors.get(vendorId);
  const app = apps.find((a) => a.id === appId && a.vendorId === vendorId);
  if (!vendor || !app) return null;
  return { vendor, app };
}

/**
 * Who is at the bench.
 *
 * The same principal `/api/me` reports, read straight off the request instead
 * of fetched back out of our own process - a server component never calls this
 * app's API. `requireAdmin` is reused so the local development bypass behaves
 * identically here and in the route handlers.
 */
export async function whoAmI(): Promise<ClientPrincipal | null> {
  const principal = (await headers()).get("x-ms-client-principal");
  try {
    return requireAdmin(
      new Request("https://wtla.invalid/", {
        headers: principal ? { "x-ms-client-principal": principal } : {},
      }),
    );
  } catch {
    return null;
  }
}
