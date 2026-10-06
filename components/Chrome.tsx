import Link from "next/link";
import { Mark } from "./Icons";
import { PLATFORM_META, type Platform } from "@/lib/api";
import { requestAppUrl } from "@/lib/site";
import { ShareMenu } from "./ShareMenu";

export function Header() {
  return (
    <header>
      <a href="#main" className="skip tag mono">
        Skip to content
      </a>
      <div className="hdr">
        <Link href="/" className="hdr__id" aria-label="Where Them Logs App - home">
          <Mark size={30} />
          <span className="hdr__word">
            Where Them
            <br />
            Logs App
          </span>
          <span className="tag mono hdr__bay">WTLA-01</span>
        </Link>
        <nav className="hdr__nav" aria-label="Primary">
          <ShareMenu />
          <Link href="/guides" className="hdr__link tag mono">
            Guides
          </Link>
          <Link href="/docs" className="hdr__link tag mono">
            Docs
          </Link>
          <Link href="/privacy" className="hdr__link tag mono">
            Privacy
          </Link>
          <a href={requestAppUrl()} className="hdr__link hdr__link--req">
            <span className="tag mono">Request an app</span>
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
    { id: "all", code: "ALL", name: "All platforms" },
    ...PLATFORM_META,
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
        Platform filter · default all
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

export function Footer({ entryCount }: { entryCount: number | null }) {
  return (
    <footer className="foot no-print">
      <div className="edge" role="presentation" />
      <div className="foot__row">
        <nav className="foot__nav tag mono" aria-label="Footer">
          <Link href="/">Index</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/privacy">Privacy &amp; cookies</Link>
          <a href={requestAppUrl()}>
            Request an app
          </a>
        </nav>
        <p className="tag mono" style={{ margin: 0 }}>
          {entryCount === null ? "Catalogue" : `${entryCount} entries`}
        </p>
      </div>
    </footer>
  );
}
