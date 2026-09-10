"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header, Footer, ZoneTabs } from "@/components/Chrome";
import { Scanner } from "@/components/Scanner";
import { RecentSearches } from "@/components/RecentSearches";
import { Consent } from "@/components/Consent";
import { Plate } from "@/components/Plate";
import { IconArrow } from "@/components/Icons";
import { getSummary, toPlates, PLATFORM_META, type Platform, type SummaryResponse } from "@/lib/api";
import { requestAppUrl } from "@/lib/site";

const ZONES = new Set<string>(PLATFORM_META.map((p) => p.id));

export default function HomePage() {
  return (
    <Suspense fallback={<Shell platform="all" />}>
      <Home />
    </Suspense>
  );
}

function Home() {
  const params = useSearchParams();
  const raw = params.get("platform") ?? "all";
  const platform: Platform | "all" = ZONES.has(raw) ? (raw as Platform) : "all";

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ctl = new AbortController();
    getSummary({ signal: ctl.signal })
      .then(setSummary)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFailed(true);
      });
    return () => ctl.abort();
  }, []);

  return <Shell platform={platform} summary={summary} failed={failed} />;
}

function Shell({
  platform,
  summary,
  failed = false,
}: {
  platform: Platform | "all";
  summary?: SummaryResponse | null;
  failed?: boolean;
}) {
  const counts: Record<string, number> = {
    all: summary?.apps ?? 0,
    ...(summary?.byPlatform ?? { windows: 0, macos: 0, linux: 0 }),
  };


  const recent = summary
    ? toPlates(summary.recent).filter((p) => platform === "all" || p.platform === platform)
    : [];

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
              <span className="sign__countNum">
                {summary ? String(summary.apps).padStart(3, "0") : "———"}
              </span>
              <span className="tag mono">apps racked · seed catalogue</span>
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
                href={platform === "all" ? "/search/" : `/search/?platform=${platform}`}
                className="ahead__all tag mono"
              >
                Browse the whole index
                <IconArrow size={14} />
              </Link>
            </div>

            {failed ? (
              <div className="rackNote">
                <p style={{ margin: 0 }}>
                  The catalogue is not answering. The index is still there — reload in a
                  moment, or search anyway and the scanner will retry.
                </p>
              </div>
            ) : !summary ? (
              <div className="rackNote">
                <p style={{ margin: 0 }}>Reading the rack&hellip;</p>
              </div>
            ) : recent.length ? (
              recent.map((plate) => <Plate key={plate.key} plate={plate} />)
            ) : (
              <div className="rackNote">
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

      <Footer entryCount={summary?.apps ?? null} />
      <Consent />
    </>
  );
}
