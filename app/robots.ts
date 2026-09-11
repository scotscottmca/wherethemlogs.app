import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wherethemlogs.app";

/**
 * The catalogue is meant to be found; the admin bench is not. /api is excluded
 * because a crawler walking search permutations is pure cost for nobody.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/403"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
