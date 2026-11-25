import Link from "next/link";
import { Mark } from "./Icons";
import { PLATFORM_META, type Platform } from "@/lib/api";
import { requestAppUrl } from "@/lib/site";
import { ShareMenu } from "./ShareMenu";

export function Header() {
  return (
    <header>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <div className="hdr">
        <Link href="/" className="hdr__id" aria-label="Where Them Logs App - home">
          <Mark size={22} />
          <span className="hdr__word">Where Them Logs App</span>
        </Link>
        <nav className="hdr__nav" aria-label="Primary">
          <ShareMenu />
          <Link href="/guides" className="hdr__link">
            Guides
          </Link>
          <Link href="/docs" className="hdr__link">
            Docs
          </Link>
          <Link href="/privacy" className="hdr__link">
            Privacy
          </Link>
          <a href={requestAppUrl()} className="hdr__link hdr__link--req">
            Request an app
          </a>
        </nav>
      </div>
    </header>
  );
}

/** The platform filter: plain links, so it works before any script loads. */
export function ZoneTabs({
  active,
  counts,
  hrefFor,
}: {
  active: Platform | "all";
  counts: Record<string, number>;
  hrefFor: (p: Platform | "all") => string;
}) {
  const zones: { id: Platform | "all"; name: string }[] = [
    { id: "all", name: "All platforms" },
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
          {z.name}
          <span className="zone__count">{counts[z.id] ?? 0}</span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * A small platform marker. Colour is never the only signal: each platform also
 * carries its own fill pattern, and sits beside its name or code.
 */
export function ZoneSwatch({ zone, size = 11 }: { zone: Platform | "all"; size?: number }) {
  const fill =
    zone === "all"
      ? "var(--tab)"
      : zone === "windows"
        ? "var(--zone-win)"
        : zone === "macos"
          ? "var(--zone-mac)"
          : "var(--zone-lnx)";

  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden focusable="false">
      <rect x="0.75" y="0.75" width="10.5" height="10.5" rx="2" fill={fill} />
      <g stroke="var(--surface)" strokeWidth="1.4">
        {zone === "windows" && <path d="M0 6h12" />}
        {zone === "macos" && <path d="M-1 9 9 -1M3 13 13 3" />}
        {zone === "linux" && <path d="M0 3h12M0 9h12" />}
        {zone === "all" && <path d="M6 0v12M0 6h12" />}
      </g>
    </svg>
  );
}

export function Footer({ entryCount }: { entryCount: number | null }) {
  return (
    <footer className="foot no-print">
      <div className="foot__row">
        <nav className="foot__nav tag" aria-label="Footer">
          <Link href="/">Home</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/privacy">Privacy &amp; cookies</Link>
          <Link href="/terms">Terms</Link>
          <a href={requestAppUrl()}>Request an app</a>
        </nav>
        <p className="tag" style={{ margin: 0 }}>
          {entryCount === null ? "Log file locations for Windows, macOS and Linux" : `${entryCount} apps`}
        </p>
      </div>
    </footer>
  );
}
