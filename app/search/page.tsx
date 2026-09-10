"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header, Footer, ZoneTabs, ZoneSwatch } from "@/components/Chrome";
import { Scanner } from "@/components/Scanner";
import { Consent } from "@/components/Consent";
import { Plate } from "@/components/Plate";
import { IconArrow, IconClose } from "@/components/Icons";
import {
  PLATFORM_META,
  TYPE_GROUPS,
  searchApps,
  toPlates,
  type Platform,
  type SearchResponse,
} from "@/lib/api";
import { requestAppUrl } from "@/lib/site";

const ZONES = new Set<string>(PLATFORM_META.map((p) => p.id));

function buildHref(base: { q: string; platform: Platform | "all"; types: string[] }) {
  const p = new URLSearchParams();
  if (base.q) p.set("q", base.q);
  if (base.platform !== "all") p.set("platform", base.platform);
  base.types.forEach((t) => p.append("type", t));
  const s = p.toString();
  return s ? `/search/?${s}` : "/search/";
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Frame />}>
      <Results />
    </Suspense>
  );
}

function Results() {
  const params = useSearchParams();
  const q = (params.get("q") ?? "").slice(0, 120);
  const rawPlatform = params.get("platform") ?? "all";
  const platform: Platform | "all" = ZONES.has(rawPlatform) ? (rawPlatform as Platform) : "all";
  const types = useMemo(
    () => params.getAll("type").flatMap((t) => t.split(",")).filter(Boolean),
    [params],
  );

  // Two calls: the unfiltered pool drives the honest zone counts and the
  // "N of M matching" line; the filtered call drives the rack.
  const [pool, setPool] = useState<SearchResponse | null>(null);
  const [filtered, setFiltered] = useState<SearchResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ctl = new AbortController();
    setFailed(false);
    Promise.all([
      searchApps({ q, platform: "all" }, { signal: ctl.signal }),
      searchApps({ q, platform, types }, { signal: ctl.signal }),
    ])
      .then(([all, narrow]) => {
        setPool(all);
        setFiltered(narrow);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFailed(true);
      });
    return () => ctl.abort();
  }, [q, platform, types]);

  const plates = filtered ? toPlates(filtered.results) : [];

  // The tabs count what the rack shows — plates, not apps — so "WIN 2" and
  // "2 plates on the pick list" can never disagree.
  const poolPlates = pool ? toPlates(pool.results) : [];
  const counts: Record<string, number> = { all: poolPlates.length };
  for (const meta of PLATFORM_META) {
    counts[meta.id] = poolPlates.filter((p) => p.platform === meta.id).length;
  }

  const offered = new Set(filtered ? filtered.results.flatMap((a) => a.types) : []);
  const hasFilters = platform !== "all" || types.length > 0;

  return (
    <Frame
      q={q}
      platform={platform}
      types={types}
      counts={counts}
      hasFilters={hasFilters}
      offered={offered}
      plates={plates}
      poolCount={poolPlates.length}
      loading={!filtered && !failed}
      failed={failed}
    />
  );
}

function Frame({
  q = "",
  platform = "all",
  types = [],
  counts = { all: 0, windows: 0, macos: 0, linux: 0 },
  hasFilters = false,
  offered = new Set<string>(),
  plates = [],
  poolCount = 0,
  loading = true,
  failed = false,
}: {
  q?: string;
  platform?: Platform | "all";
  types?: string[];
  counts?: Record<string, number>;
  hasFilters?: boolean;
  offered?: Set<string>;
  plates?: ReturnType<typeof toPlates>;
  poolCount?: number;
  loading?: boolean;
  failed?: boolean;
} = {}) {
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
              {loading
                ? "Reading the rack…"
                : failed
                  ? "The catalogue is not answering"
                  : `${plates.length} ${plates.length === 1 ? "plate" : "plates"} on the pick list${
                      hasFilters ? ` · ${poolCount} match the query` : ""
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
                Zone
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
            {loading ? (
              <div className="void">
                <p className="void__p">Reading the rack&hellip;</p>
              </div>
            ) : failed ? (
              <div className="void">
                <h2 className="void__h">The catalogue is not answering</h2>
                <p className="void__p">
                  The index is still there — this is the API, not your query. Reload in a
                  moment.
                </p>
              </div>
            ) : plates.length ? (
              plates.map((plate, i) => <Plate key={plate.key} plate={plate} index={i} animate />)
            ) : (
              <div className="void">
                <h2 className="void__h">
                  {poolCount
                    ? "Every match was filtered out"
                    : q
                      ? `Nothing racked under “${q}”`
                      : "The index is empty for this zone"}
                </h2>
                <p className="void__p">
                  {poolCount
                    ? `“${q}” matches ${poolCount} ${poolCount === 1 ? "plate" : "plates"}, but none of them carry every tag you selected. Drop a tag or widen the zone.`
                    : "Check the spelling, try the vendor name, or open a request — the catalogue grows from them."}
                </p>
                {poolCount ? (
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
