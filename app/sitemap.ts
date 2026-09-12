import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { getSnapshot } from "@/lib/server/catalog";
import { PRIVACY_LAST_UPDATED } from "@/lib/site";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wherethemlogs.app";

// Reads the catalogue, so it cannot be prerendered at build time (no Cosmos
// access there) - it is rendered per request instead.
export const dynamic = "force-dynamic";

/**
 * Only the routes worth indexing. /search is deliberately absent: it is a query
 * surface with unbounded permutations, not a set of pages.
 *
 * changeFrequency and priority are omitted: Google ignores both. lastModified
 * is what it actually uses to decide what to recrawl.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl },
    { url: `${siteUrl}/docs` },
    { url: `${siteUrl}/guides` },
    ...GUIDES.map((guide) => ({
      url: `${siteUrl}/guides/${guide.slug}`,
      lastModified: guide.updated,
    })),
    { url: `${siteUrl}/privacy`, lastModified: PRIVACY_LAST_UPDATED },
  ];

  try {
    const { apps, vendors } = await getSnapshot();
    let newest: string | undefined;
    // A vendor page is only as fresh as its newest app, and only exists at all
    // when the vendor owns one - the same rule /vendors/[slug] renders by.
    const vendorLastModified = new Map<string, string>();
    for (const app of apps) {
      // The icon an app actually shows: its own, or the vendor's when it has
      // none - the same fallback resolveApp applies on read. No icon, no
      // images key, rather than a placeholder URL Google would fetch and bin.
      const icon = app.iconUrl ?? vendors.get(app.vendorId)?.iconUrl ?? null;
      entries.push({
        url: `${siteUrl}/apps/${app.slug}`,
        lastModified: app.updatedAt,
        ...(icon ? { images: [icon] } : {}),
      });
      if (!newest || app.updatedAt > newest) newest = app.updatedAt;
      const seen = vendorLastModified.get(app.vendorId);
      if (!seen || app.updatedAt > seen) vendorLastModified.set(app.vendorId, app.updatedAt);
    }
    for (const [vendorId, lastModified] of vendorLastModified) {
      const vendor = vendors.get(vendorId);
      if (!vendor) continue;
      entries.push({
        url: `${siteUrl}/vendors/${vendor.slug}`,
        lastModified,
        ...(vendor.iconUrl ? { images: [vendor.iconUrl] } : {}),
      });
    }
    // The home entry's lastModified is the newest app update - omitted, not
    // faked, when the catalogue can't be read at all.
    if (newest) entries[0].lastModified = new Date(newest);
  } catch {
    // The catalogue is unreachable. The static routes above still get listed
    // rather than failing the whole sitemap.
  }

  return entries;
}
