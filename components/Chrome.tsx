import Link from "next/link";
import { Mark, IconExternal } from "./Icons";
import { PLATFORMS, type Platform } from "@/lib/catalog";
import { requestAppUrl } from "@/lib/site";

export function Header() {
  return (
    <header>
      <div className="hazard" role="presentation" />
      <div className="hdr">
        <Link href="/" className="hdr__id" aria-label="Where Them Logs App — home">
          <Mark size={30} />
          <span className="hdr__word">
            Where Them
            <br />
            Logs App
          </span>
          <span className="tag mono hdr__bay">Bay WTLA·01</span>
        </Link>
        <nav className="hdr__nav" aria-label="Primary">
          <Link href="/privacy" className="hdr__link tag mono">
            Privacy
          </Link>
          <a
            href={requestAppUrl()}
            className="hdr__link hdr__link--req"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="tag mono">Request an app</span>
            <IconExternal size={15} />
          </a>
        </nav>
      </div>
    </header>
  );
}

/** Zone banding: platform is a filter, and it is also the aisle you are standing in. */
export function ZoneTabs({
  active,
  counts,
  hrefFor,
}: {
  active: Platform | "all";
  counts: Record<string, number>;
  hrefFor: (p: Platform | "all") => string;
}) {
  const zones: { id: Platform | "all"; code: string; name: string }[] = [
    { id: "all", code: "ALL", name: "All zones" },
    ...PLATFORMS,
  ];

  return (
    <nav className="zones" aria-label="Filter by platform">
      {zones.map((z) => (
        <Link
          key={z.id}
          href={hrefFor(z.id)}
          className="zone"
          data-zone={z.id}
          aria-current={active === z.id ? "true" : undefined}
          scroll={false}
        >
          <ZoneSwatch zone={z.id} />
          <span className="tag mono">{z.code}</span>
          <span className="tag mono zone__count">{counts[z.id] ?? 0}</span>
        </Link>
      ))}
      <span className="zones__legend tag mono" aria-hidden>
        Zone filter · default all
      </span>
    </nav>
  );
}

/**
 * Colour is never the only signal: each zone also carries its own fill pattern
 * and its own three-letter code.
 */
export function ZoneSwatch({ zone, size = 11 }: { zone: Platform | "all"; size?: number }) {
  const fill =
    zone === "all"
      ? "var(--hivis)"
      : zone === "windows"
        ? "var(--zone-win)"
        : zone === "macos"
          ? "var(--zone-mac)"
          : "var(--zone-lnx)";

  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden focusable="false">
      <rect x="0.75" y="0.75" width="10.5" height="10.5" fill={fill} />
      <g stroke="var(--ink)" strokeWidth="1.4">
        {zone === "windows" && <path d="M0 6h12" />}
        {zone === "macos" && <path d="M-1 9 9 -1M3 13 13 3" />}
        {zone === "linux" && <path d="M0 3h12M0 9h12" />}
        {zone === "all" && <path d="M6 0v12M0 6h12" />}
      </g>
      <rect
        x="0.75"
        y="0.75"
        width="10.5"
        height="10.5"
        fill="none"
        stroke="var(--ink-rule)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function Footer({ entryCount }: { entryCount: number }) {
  return (
    <footer className="foot no-print">
      <div className="hazard" role="presentation" />
      <div className="foot__row">
        <nav className="foot__nav tag mono" aria-label="Footer">
          <Link href="/">Index</Link>
          <Link href="/privacy">Privacy &amp; cookies</Link>
          <a href={requestAppUrl()} target="_blank" rel="noopener noreferrer">
            Request an app
          </a>
        </nav>
        <p className="tag mono" style={{ margin: 0 }}>
          {entryCount} entries · Seed catalogue
        </p>
      </div>
      <p className="foot__seed">
        Seed catalogue. Every path listed is real and verifiable, but this build ships a
        demonstration set, not the full index. Paths are printed exactly as the operating
        system resolves them — environment variables are never expanded for you, because the
        machine you are fixing is not this one.
      </p>
    </footer>
  );
}
