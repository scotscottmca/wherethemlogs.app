import type { MetadataRoute } from "next";
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
    { url: `${siteUrl}/privacy`, lastModified: PRIVACY_LAST_UPDATED },
  ];

  try {
    const { apps } = await getSnapshot();
    let newest: string | undefined;
    for (const app of apps) {
      entries.push({ url: `${siteUrl}/apps/${app.slug}`, lastModified: app.updatedAt });
      if (!newest || app.updatedAt > newest) newest = app.updatedAt;
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
