import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header, Footer, ZoneSwatch } from "@/components/Chrome";
import { Consent } from "@/components/Consent";
import { PLATFORM_META } from "@/lib/api";
import { vendorJsonLd } from "@/lib/jsonld";
import { getSnapshot } from "@/lib/server/catalog";
import { resolveApp, type Platform, type ResolvedApp, type Vendor } from "@/lib/model";

export const dynamic = "force-dynamic";

interface VendorPage {
  vendor: Vendor;
  apps: ResolvedApp[];
  platforms: Platform[];
  pathCount: number;
}

/**
 * Same in-process snapshot every other read goes through. A vendor with no
 * apps has nothing to show and nothing to index, so it is a 404 - the same
 * answer /apps/[slug] gives for a slug that isn't in the catalogue.
 */
async function loadVendor(slug: string): Promise<VendorPage | null> {
  const { apps, vendors } = await getSnapshot();
  const vendor = [...vendors.values()].find((v) => v.slug === slug);
  if (!vendor) return null;

  const owned = apps
    .filter((a) => a.vendorId === vendor.id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => resolveApp(a, vendor));
  if (!owned.length) return null;

  return {
    vendor,
    apps: owned,
    platforms: PLATFORM_META.filter((m) => owned.some((a) => a.platforms.includes(m.id))).map(
      (m) => m.id,
    ),
    pathCount: owned.reduce((n, a) => n + a.logPaths.length, 0),
  };
}

const platformNames = (platforms: Platform[]) =>
  PLATFORM_META.filter((m) => platforms.includes(m.id)).map((m) => m.name);

/** The page's own words for itself - the metadata and the JSON-LD share them. */
function describe({ vendor, apps, platforms, pathCount }: VendorPage) {
  const names = platformNames(platforms);

  return {
    title: `${vendor.name} log file locations - ${apps.length} ${
      apps.length === 1 ? "app" : "apps"
    }`,
    description: `Where ${vendor.name} applications store their log files${
      names.length ? ` on ${names.join(", ")}` : ""
    }: ${apps.length === 1 ? "1 app" : `${apps.length} apps`}, ${
      pathCount === 1 ? "1 verified log location" : `${pathCount} verified log locations`
    }.`,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  let page: VendorPage | null = null;
  try {
    page = await loadVendor(slug);
  } catch {
    // The catalogue is unreachable. Fall through to a generic title; the page
    // body handles the same failure with its own message.
  }

  if (!page) return { title: "Vendor not found" };

  const { vendor } = page;
  const { title, description } = describe(page);

  return {
    title,
    description,
    alternates: { canonical: `/vendors/${vendor.slug}` },
    openGraph: { url: `/vendors/${vendor.slug}`, title, description },
  };
}

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let page: VendorPage | null = null;
  let failed = false;
  try {
    page = await loadVendor(slug);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <>
        <Header />
        <main className="rack">
          <div className="void">
            <h2 className="void__h">The catalogue is not answering</h2>
            <p className="void__p">
              The index is still there - this is the store, not this page. Reload in a moment.
            </p>
          </div>
        </main>
        <Footer entryCount={null} />
        <Consent />
      </>
    );
  }

  if (!page) notFound();

  const { vendor, apps, platforms, pathCount } = page;
  const names = platformNames(platforms);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: vendorJsonLd(vendor, apps, describe(page).description),
        }}
      />
      <Header />
      <main className="rack">
        <div className="picklist">
          <div>
            <h1 className="void__h" style={{ margin: 0 }}>
              {vendor.name}
            </h1>
          </div>
          <div>
            <p className="tag mono" style={{ margin: 0 }}>
              {apps.length} {apps.length === 1 ? "app" : "apps"} · {pathCount} log{" "}
              {pathCount === 1 ? "location" : "locations"}
              {names.length ? ` · ${names.join(", ")}` : ""}
            </p>
          </div>
        </div>

        <div className="rackNote" style={{ paddingInline: 0, maxWidth: "72ch" }}>
          <p style={{ margin: 0 }}>
            Every {vendor.name} application in the catalogue, with the log file locations
            recorded for each one.
            {vendor.website && (
              <>
                {" "}
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--hivis)" }}
                >
                  Vendor website
                </a>
                .
              </>
            )}
          </p>
        </div>

        <ul className="picks">
          {apps.map((app) => (
            <li key={app.id} className="pick">
              <Link className="pick__link" href={`/apps/${app.slug}`}>
                <span className="pick__app">{app.name}</span>
                <span className="pick__zones">
                  {PLATFORM_META.filter((m) => app.platforms.includes(m.id)).map((m) => (
                    <span key={m.id} className="zonetag tag mono">
                      <ZoneSwatch zone={m.id} size={9} />
                      {m.code}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <Footer entryCount={null} />
      <Consent />
    </>
  );
}
