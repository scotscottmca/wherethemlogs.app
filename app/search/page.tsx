import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer, ZoneTabs, ZoneSwatch } from "@/components/Chrome";
import { Scanner } from "@/components/Scanner";
import { Consent } from "@/components/Consent";
import { Plate } from "@/components/Plate";
import { IconArrow, IconClose } from "@/components/Icons";
import { PLATFORM_META, TYPE_GROUPS, toPlates, type Platform } from "@/lib/api";
import { search } from "@/lib/server/catalog";
import { requestAppUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const ZONES = new Set<string>(PLATFORM_META.map((p) => p.id));
const pathCount = (list: ReturnType<typeof toPlates>) => list.reduce((n, p) => n + p.logPaths.length, 0);

type SP = { q?: string; platform?: string; type?: string | string[] };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const { q, platform, type } = await searchParams;
  const filtered = Boolean(platform) || Boolean(type);
  const canonical = q ? `/search?q=${encodeURIComponent(q)}` : "/search";

  if (!q) {
    return {
      title: "Browse the index",
      description:
        "Every application in the index, with log file locations for Windows, macOS and Linux, filterable by installer type and architecture.",
      alternates: { canonical },
      openGraph: { url: canonical },
      ...(filtered ? { robots: { index: false, follow: true } } : {}),
    };
  }

  // Name the app when the query clearly names one - "Google Chrome log file
  // locations" reads better in results than the raw query ever will. Falls
  // back to the query itself, including when search() finds nothing. The
  // same call also drives the empty-results noindex check below, so there is
  // only one snapshot read for this whole function.
  let appName: string | undefined;
  let noResults = false;
  try {
    const { results } = await search({ q, platform: "all", types: [] });
    noResults = results.length === 0;
    const top = results[0];
    if (top) {
      const needle = q.trim().toLowerCase();
      const haystacks = [top.name, ...top.aliases].map((s) => s.toLowerCase());
      if (haystacks.includes(needle)) appName = top.name;
    }
  } catch {
    // Snapshot unavailable - fall back to the query-based title below, and
    // keep this out of the index like a soft 404.
    noResults = true;
  }

  return {
    title: appName ? `${appName} log file locations` : `Log file locations matching "${q}"`,
    description: `Log file locations for ${q}, qualified by platform, installer type and architecture.`,
    alternates: { canonical },
    openGraph: { url: canonical },
    ...(filtered || noResults ? { robots: { index: false, follow: true } } : {}),
  };
}

function asTypes(t: SP["type"]): string[] {
  if (!t) return [];
  return (Array.isArray(t) ? t : [t]).flatMap((v) => v.split(",")).filter(Boolean);
}

function buildHref(base: { q: string; platform: Platform | "all"; types: string[] }) {
  const p = new URLSearchParams();
  if (base.q) p.set("q", base.q);
  if (base.platform !== "all") p.set("platform", base.platform);
  base.types.forEach((t) => p.append("type", t));
  const s = p.toString();
  return s ? `/search?${s}` : "/search";
}

export default async function Results({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 120);
  const platform: Platform | "all" = ZONES.has(sp.platform ?? "") ? (sp.platform as Platform) : "all";
  const types = asTypes(sp.type);

  let failed = false;
  let poolPlates: ReturnType<typeof toPlates> = [];
  let plates: ReturnType<typeof toPlates> = [];
  let offered = new Set<string>();

  try {
    // The unfiltered pool drives honest zone counts and the "N of M" line;
    // the filtered one drives the rack. Both hit the same in-process cache.
    const [pool, narrowed] = await Promise.all([
      search({ q, platform: "all", types: [] }),
      search({ q, platform, types }),
    ]);
    poolPlates = toPlates(pool.results);
    plates = toPlates(narrowed.results);
    offered = new Set(narrowed.results.flatMap((a) => a.types));
  } catch {
    failed = true;
  }

  // The tabs count what the rack shows - plates, not apps - so "WIN 2" and
  // "2 plates on the pick list" can never disagree.
  const counts: Record<string, number> = { all: poolPlates.length };
  for (const meta of PLATFORM_META) {
    counts[meta.id] = poolPlates.filter((p) => p.platform === meta.id).length;
  }

  const hasFilters = platform !== "all" || types.length > 0;

  return (
    <>
      <Header />
      <ZoneTabs active={platform} counts={counts} hrefFor={(p) => buildHref({ q, platform: p, types })} />

      <main className="rack">
        <div className="picklist">
          <div>
            {q ? (
              <h1 className="picklist__q mono">{q}</h1>
            ) : (
              <h1
                className="picklist__q mono"
                style={{ fontFamily: "inherit", fontStretch: "68%", fontWeight: 900, textTransform: "uppercase" }}
              >
                The whole index
              </h1>
            )}
          </div>
          <div>
            <p className="tag mono" style={{ margin: 0 }}>
              {failed
                ? "The catalogue is not answering"
                : `${pathCount(plates)} log ${pathCount(plates) === 1 ? "location" : "locations"} tracked${
                    hasFilters ? ` · ${pathCount(poolPlates)} match the query` : ""
                  }`}
            </p>
            <a className="picklist__refine tag mono" href="#refine">
              Jump to refine
              <IconArrow size={13} />
            </a>
          </div>
        </div>

        <Scanner platform={platform} initialQuery={q} />

        <div className="results">
          <details className="filters" id="refine" aria-label="Refine results" open>
            <summary className="rackHead filters__summary">
              <span className="tag mono">
                Refine
                {hasFilters ? ` · ${(platform === "all" ? 0 : 1) + types.length} active` : ""}
              </span>
              <span className="tag mono filters__chevron" aria-hidden>
                Open / close
              </span>
            </summary>

            {hasFilters && (
              <div className="filters__group">
                <Link className="filters__clear tag mono" href={buildHref({ q, platform: "all", types: [] })}>
                  <IconClose size={12} />
                  Clear every filter
                </Link>
              </div>
            )}

            <div className="filters__group">
              <p className="tag mono" style={{ margin: 0 }}>
                Platform
              </p>
              <div className="filters__set">
                {[{ id: "all" as const, code: "All" }, ...PLATFORM_META.map((p) => ({ id: p.id, code: p.name }))].map(
                  (z) => (
                    <Link
                      key={z.id}
                      className="tog tag mono"
                      href={buildHref({ q, platform: z.id, types })}
                      aria-pressed={platform === z.id}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <ZoneSwatch zone={z.id} size={10} />
                      {z.code}
                    </Link>
                  ),
                )}
              </div>
            </div>

            {TYPE_GROUPS.map((group) => {
              const shown = group.types.filter((t) => offered.has(t) || types.includes(t));
              if (!shown.length) return null;
              return (
                <div className="filters__group" key={group.label}>
                  <p className="tag mono" style={{ margin: 0 }}>
                    {group.label}
                  </p>
                  <div className="filters__set">
                    {shown.map((t) => {
                      const on = types.includes(t);
                      const next = on ? types.filter((x) => x !== t) : [...types, t];
                      return (
                        <Link
                          key={t}
                          className="tog tag mono"
                          href={buildHref({ q, platform, types: next })}
                          aria-pressed={on}
                        >
                          {t}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="rackNote">
              <p style={{ margin: 0 }}>
                Filters stack: every tag you switch on must be true of the entry, so{" "}
                <span className="mono" style={{ color: "var(--bone-dim)" }}>
                  msi + x64
                </span>{" "}
                returns only 64-bit MSI deployments.
              </p>
            </div>
          </details>

          <div className="resultsBody">
            <h2 className="visually-hidden">Results</h2>
            {failed ? (
              <div className="void">
                <h2 className="void__h">The catalogue is not answering</h2>
                <p className="void__p">
                  The index is still there - this is the store, not your query. Reload in a
                  moment.
                </p>
              </div>
            ) : plates.length ? (
              plates.map((plate, i) => <Plate key={plate.key} plate={plate} index={i} animate />)
            ) : (
              <div className="void">
                <h2 className="void__h">
                  {poolPlates.length
                    ? "Every match was filtered out"
                    : q
                      ? `Nothing found for “${q}”`
                      : "The index is empty for this platform"}
                </h2>
                <p className="void__p">
                  {poolPlates.length
                    ? `“${q}” matches ${poolPlates.length} ${poolPlates.length === 1 ? "result" : "results"}, but none of them carry every tag you selected. Drop a tag or switch to all platforms.`
                    : "Check the spelling, try the vendor name, or open a request - the catalogue grows from them."}
                </p>
                {poolPlates.length ? (
                  <Link className="btn tag mono" href={buildHref({ q, platform: "all", types: [] })}>
                    Clear the filters
                    <IconArrow size={15} />
                  </Link>
                ) : (
                  <a
                    className="btn tag mono"
                    href={requestAppUrl(q || undefined)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {q ? `Request “${q}”` : "Request an application"}
                    <IconArrow size={15} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer entryCount={null} />
      <Consent />
    </>
  );
}
