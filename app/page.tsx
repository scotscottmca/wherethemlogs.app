import Link from "next/link";
import { Header, Footer, ZoneTabs } from "@/components/Chrome";
import { Scanner } from "@/components/Scanner";
import { RecentSearches } from "@/components/RecentSearches";
import { Consent } from "@/components/Consent";
import { Plate } from "@/components/Plate";
import { IconArrow } from "@/components/Icons";
import { PLATFORMS, recentAdditions, searchCatalog, totalEntries, type Platform } from "@/lib/catalog";
import { requestAppUrl } from "@/lib/site";

const ZONES = new Set<string>(PLATFORMS.map((p) => p.id));

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const sp = await searchParams;
  const platform: Platform | "all" = ZONES.has(sp.platform ?? "") ? (sp.platform as Platform) : "all";

  const counts: Record<string, number> = { all: totalEntries() };
  for (const p of PLATFORMS) counts[p.id] = searchCatalog({ q: "", platform: p.id }).length;

  const additions = recentAdditions(6).filter((e) => platform === "all" || e.platform === platform);

  return (
    <>
      <Header />
      <ZoneTabs
        active={platform}
        counts={counts}
        hrefFor={(p) => (p === "all" ? "/" : `/?platform=${p}`)}
      />

      <main className="rack">
        <div className="sign">
          <h1 className="sign__h">Where them logs at</h1>
          <div className="sign__row">
            <p className="sign__sub">
              The log file location for any application, on Windows, macOS or Linux — every
              path qualified by installer type and architecture, printed exactly as the
              machine writes it.
            </p>
            <p className="sign__count">
              <span className="sign__countNum">{String(totalEntries()).padStart(3, "0")}</span>
              <span className="tag mono">entries racked · seed catalogue</span>
            </p>
          </div>
        </div>

        <Scanner platform={platform} />

        <div className="racks">
          <section className="rackCol" aria-labelledby="added-h">
            <div className="rackHead">
              <h2 className="tag mono" id="added-h" style={{ margin: 0 }}>
                Recent additions
              </h2>
              <Link
                href={platform === "all" ? "/search" : `/search?platform=${platform}`}
                className="ahead__all tag mono"
              >
                Browse the whole index
                <IconArrow size={14} />
              </Link>
            </div>

            {additions.length ? (
              additions.map((e) => <Plate key={e.id} entry={e} />)
            ) : (
              <div className="rackNote mono">
                <p style={{ margin: 0 }}>
                  Nothing added to this zone yet. Switch the zone filter above, or request
                  the application you were looking for.
                </p>
              </div>
            )}
          </section>

          <RecentSearches platform={platform} />
        </div>

        <p className="rackNote" style={{ paddingInline: 0, maxWidth: "72ch" }}>
          Missing something? Requests are tracked as GitHub issues — one issue per
          application, with the platform and installer type in the title.{" "}
          <a
            href={requestAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--hivis)" }}
          >
            Open a request.
          </a>
        </p>
      </main>

      <Footer entryCount={totalEntries()} />
      <Consent />
    </>
  );
}
