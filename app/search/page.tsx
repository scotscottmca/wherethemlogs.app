import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer, ZoneTabs, ZoneSwatch } from "@/components/Chrome";
import { Scanner } from "@/components/Scanner";
import { Consent } from "@/components/Consent";
import { Plate } from "@/components/Plate";
import { IconArrow, IconClose } from "@/components/Icons";
import {
  PLATFORMS,
  TYPE_GROUPS,
  availableTypes,
  searchCatalog,
  totalEntries,
  type Platform,
} from "@/lib/catalog";
import { requestAppUrl } from "@/lib/site";

const ZONES = new Set<string>(PLATFORMS.map((p) => p.id));

type SP = { q?: string; platform?: string; type?: string | string[] };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `“${q}” — results` : "Browse the index" };
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

  // Unfiltered pool for the query, so the rail can show what is on offer and
  // the zone tabs can carry honest counts for this query.
  const pool = searchCatalog({ q, platform: "all" });
  const results = searchCatalog({ q, platform, types });

  const counts: Record<string, number> = { all: pool.length };
  for (const p of PLATFORMS) counts[p.id] = pool.filter((e) => e.platform === p.id).length;

  const offered = new Set(availableTypes(searchCatalog({ q, platform })));
  const hasFilters = platform !== "all" || types.length > 0;

  return (
    <>
      <Header />
      <ZoneTabs
        active={platform}
        counts={counts}
        hrefFor={(p) => buildHref({ q, platform: p, types })}
      />

      <main className="rack">
        <div className="picklist">
          <div>
            {q ? (
              <h1 className="picklist__q mono">{q}</h1>
            ) : (
              <h1 className="picklist__q mono" style={{ fontFamily: "inherit", fontStretch: "68%", fontWeight: 900, textTransform: "uppercase" }}>
                The whole index
              </h1>
            )}
          </div>
          <div>
            <p className="tag mono" style={{ margin: 0 }}>
              {results.length} {results.length === 1 ? "plate" : "plates"} on the pick list
              {hasFilters ? ` · ${pool.length} match the query` : ""}
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
                {hasFilters ? ` · ${1 + types.length} active` : ""}
              </span>
              <span className="tag mono filters__chevron" aria-hidden>
                Open / close
              </span>
            </summary>
            {hasFilters && (
              <div className="filters__group">
                <Link
                  className="filters__clear tag mono"
                  href={buildHref({ q, platform: "all", types: [] })}
                >
                  <IconClose size={12} />
                  Clear every filter
                </Link>
              </div>
            )}

            <div className="filters__group">
              <p className="tag mono" style={{ margin: 0 }}>
                Zone
              </p>
              <div className="filters__set">
                {[{ id: "all" as const, code: "All" }, ...PLATFORMS.map((p) => ({ id: p.id, code: p.name }))].map(
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
            {results.length ? (
              results.map((e, i) => <Plate key={e.id} entry={e} index={i} animate />)
            ) : (
              <div className="void">
                <h2 className="void__h">
                  {pool.length
                    ? "Every match was filtered out"
                    : q
                      ? `Nothing racked under “${q}”`
                      : "The index is empty for this zone"}
                </h2>
                <p className="void__p">
                  {pool.length
                    ? `“${q}” matches ${pool.length} ${pool.length === 1 ? "plate" : "plates"}, but none of them carry every tag you selected. Drop a tag or widen the zone.`
                    : "Check the spelling, try the vendor name, or open a request — the catalogue grows from them."}
                </p>
                {pool.length ? (
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

      <Footer entryCount={totalEntries()} />
      <Consent />
    </>
  );
}
