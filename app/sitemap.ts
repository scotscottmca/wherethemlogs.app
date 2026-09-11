import type { MetadataRoute } from "next";
import { getSnapshot } from "@/lib/server/catalog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wherethemlogs.app";

// Reads the catalogue, so it cannot be prerendered at build time (no Cosmos
// access there) - it is rendered per request instead.
export const dynamic = "force-dynamic";

/**
 * Only the routes worth indexing. /search is deliberately absent: it is a query
 * surface with unbounded permutations, not a set of pages.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/docs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const { apps } = await getSnapshot();
    for (const app of apps) {
      entries.push({ url: `${siteUrl}/apps/${app.slug}`, lastModified: app.updatedAt });
    }
  } catch {
    // The catalogue is unreachable. The static routes above still get listed
    // rather than failing the whole sitemap.
  }

  return entries;
}
