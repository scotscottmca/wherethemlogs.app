import type { MetadataRoute } from "next";
import { summary } from "@/lib/server/catalog";
import { PRIVACY_LAST_UPDATED } from "@/lib/site";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wherethemlogs.app";

// The home entry's lastModified needs a live catalog read (Cosmos), which a
// static build has no access to. Reading it at request time instead of build
// time means this route cannot be prerendered.
export const dynamic = "force-dynamic";

/**
 * Only the routes worth indexing. /search is deliberately absent: it is a query
 * surface with unbounded permutations, not a set of pages.
 *
 * changeFrequency and priority are omitted: Google ignores both. lastModified
 * is what it actually uses to decide what to recrawl.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let homeLastModified: Date | undefined;
  try {
    const { recent } = await summary();
    const newest = recent[0]?.updatedAt;
    if (newest) homeLastModified = new Date(newest);
  } catch {
    // Catalog unreachable (e.g. no Cosmos access in this environment). Omit
    // lastModified for / rather than fail the whole sitemap.
    homeLastModified = undefined;
  }

  return [
    { url: siteUrl, ...(homeLastModified ? { lastModified: homeLastModified } : {}) },
    { url: `${siteUrl}/docs` },
    { url: `${siteUrl}/privacy`, lastModified: PRIVACY_LAST_UPDATED },
  ];
}
