import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wherethemlogs.app";

/**
 * The catalogue is meant to be found; the admin bench is not. /api is excluded
 * because a crawler walking search permutations is pure cost for nobody.
 *
 * The single `*` group is deliberate, and that includes the answer engines:
 * GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot,
 * Google-Extended and the rest are allowed everything a search crawler is.
 * Being the cited source for "where does X log" is the point of the site, so
 * there is no AI-specific group here and no opt-out token. Anything that
 * tightens `*` later has to decide about them on purpose - see
 * docs/ANSWER-ENGINES.md.
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
