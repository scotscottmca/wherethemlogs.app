import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer, ZoneTabs } from "@/components/Chrome";
import { Scanner } from "@/components/Scanner";
import { RecentSearches } from "@/components/RecentSearches";
import { Consent } from "@/components/Consent";
import { PLATFORM_META, type Platform } from "@/lib/api";
import { summary } from "@/lib/server/catalog";
import { requestAppUrl } from "@/lib/site";

// Rendered per request, straight out of Cosmos. No client fetch, no loading
// shell, and the catalogue is in the HTML a crawler receives.
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wherethemlogs.app";

// The values here are all static and server-controlled, but a </script>
// escape is cheap insurance for any JSON-LD block.
const websiteJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Where Them Logs App",
  alternateName: "wherethemlogs.app",
  url: `${siteUrl}/`,
}).replace(/</g, "\\u003c");

const ZONES = new Set<string>(PLATFORM_META.map((p) => p.id));

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}): Promise<Metadata> {
  const { platform } = await searchParams;
  return {
    alternates: { canonical: "/" },
    openGraph: { url: "/" },
    ...(platform ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const sp = await searchParams;
  const platform: Platform | "all" = ZONES.has(sp.platform ?? "") ? (sp.platform as Platform) : "all";

  let data: Awaited<ReturnType<typeof summary>> | null = null;
  try {
    data = await summary();
  } catch {
    // The store is unreachable. The page still renders, and says so, rather
    // than 500ing at someone mid-incident.
  }

  const counts: Record<string, number> = {
    all: data?.apps ?? 0,
    ...(data?.byPlatform ?? { windows: 0, macos: 0, linux: 0 }),
  };

  const recent = data
    ? data.recent.filter((a) => platform === "all" || a.platforms.includes(platform))
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: websiteJsonLd }}
      />
      <Header />

      <main id="main" tabIndex={-1} className="rack">
        <div className="home">
          <h1 className="sign__h">
            {/* The name drawn as a path. The words themselves follow, hidden,
                for screen readers and search engines. */}
            <span aria-hidden="true">
              where<i>/</i>them<i>/</i>logs<i>/</i>
            </span>
            <span className="visually-hidden">Where them logs at</span>
            <span className="sign__hSub">
              Log file locations for Windows, macOS and Linux
              {data ? ` · ${data.apps} apps tracked` : ""}
            </span>
          </h1>

          <Scanner platform={platform} />

          <ZoneTabs
            active={platform}
            counts={counts}
            hrefFor={(p) => (p === "all" ? "/" : `/?platform=${p}`)}
          />

          {!data ? (
            <p className="rackNote" style={{ margin: 0 }}>
              The catalogue is not answering. The index is still there - reload in a moment, or
              search anyway and it will retry.
            </p>
          ) : recent.length ? (
            <p className="added">
              <span>Recently added:</span>
              {recent.slice(0, 4).map((app) => (
                <Link key={app.id} href={`/apps/${app.slug}`}>
                  {app.name}
                </Link>
              ))}
              <Link href={platform === "all" ? "/search" : `/search?platform=${platform}`}>
                Browse every app
              </Link>
            </p>
          ) : (
            <p className="rackNote" style={{ margin: 0 }}>
              Nothing added for this platform yet. Switch the platform filter above, or request
              the application you were looking for.
            </p>
          )}

          <RecentSearches platform={platform} />

          <div className="rackNote">
            <p style={{ margin: 0 }}>
              The log file location for any application, on Windows, macOS or Linux - every path
              qualified by installer type and architecture, printed exactly as the machine writes
              it.
            </p>
            <p style={{ margin: 0 }}>
              Missing something? Fill in the request form and it becomes a public GitHub issue -
              no GitHub account needed. <a href={requestAppUrl()}>Open a request.</a>
            </p>
          </div>
        </div>
      </main>

      <Footer entryCount={data?.apps ?? null} />
      <Consent />
    </>
  );
}
