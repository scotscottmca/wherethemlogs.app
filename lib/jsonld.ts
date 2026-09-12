/**
 * JSON-LD for the pages that need to be understood, not just read.
 *
 * One page, one page-level type. An app page is declared a FAQPage - the
 * question it answers is literally "where does X log on Y" - with the
 * application itself hung off `about` as a SoftwareApplication rather than
 * typing the page as one: this site indexes where an app writes its logs, it
 * is not a download page for the app, and claiming otherwise invites a
 * structured-data warning for the fields (offers, ratings) a real
 * SoftwareApplication page would carry.
 */
import type { PlatformSummary } from "./api";
import type { ResolvedApp, Vendor } from "./model";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wherethemlogs.app";

/**
 * Serialise for a <script> block. Names and paths come from the catalogue, so
 * a </script> escape is not optional here the way it is for static values.
 */
export const jsonLd = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, "\\u003c");

const crumbs = (trail: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.map((crumb, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: crumb.name,
    item: `${siteUrl}${crumb.path}`,
  })),
});

export function appJsonLd(
  app: ResolvedApp,
  summaries: PlatformSummary[],
  description: string,
): string {
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl}/apps/${app.slug}`,
    url: `${siteUrl}/apps/${app.slug}`,
    name: `${app.name} log file locations`,
    description,
    about: {
      "@type": "SoftwareApplication",
      name: app.name,
      ...(app.aliases.length ? { alternateName: app.aliases } : {}),
      // Distinct platforms this app has paths for, named the way people say
      // them. applicationCategory is left off: the catalogue does not record
      // one, and guessing is worse than omitting.
      operatingSystem: summaries.map((s) => s.name),
      publisher: {
        "@type": "Organization",
        name: app.vendor.name,
        url: `${siteUrl}/vendors/${app.vendor.slug}`,
      },
    },
    mainEntity: summaries.map((s) => ({
      "@type": "Question",
      name: `Where does ${app.name} store its log files on ${s.name}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: s.detail ? `${s.answer} ${s.detail}` : s.answer,
      },
    })),
    breadcrumb: crumbs([
      { name: "Home", path: "/" },
      { name: app.vendor.name, path: `/vendors/${app.vendor.slug}` },
      { name: app.name, path: `/apps/${app.slug}` },
    ]),
  });
}

export function vendorJsonLd(
  vendor: Vendor,
  apps: ResolvedApp[],
  description: string,
): string {
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}/vendors/${vendor.slug}`,
    url: `${siteUrl}/vendors/${vendor.slug}`,
    name: `${vendor.name} log file locations`,
    description,
    about: {
      "@type": "Organization",
      name: vendor.name,
      ...(vendor.website ? { url: vendor.website } : {}),
      ...(vendor.iconUrl ? { logo: vendor.iconUrl } : {}),
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: apps.length,
      itemListElement: apps.map((app, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: app.name,
        url: `${siteUrl}/apps/${app.slug}`,
      })),
    },
    breadcrumb: crumbs([
      { name: "Home", path: "/" },
      { name: vendor.name, path: `/vendors/${vendor.slug}` },
    ]),
  });
}
