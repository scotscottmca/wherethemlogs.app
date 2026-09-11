import Link from "next/link";
import { ZoneSwatch } from "./Chrome";
import { IconCorner } from "./Icons";
import type { Platform } from "@/lib/api";
import { PLATFORM_META } from "@/lib/api";

/**
 * The curator's chrome.
 *
 * The band under the header sits where the zone banding sits on the public
 * pages and is built from the same parts - hairline-divided cells with no gap,
 * a 2px rule underneath, the current cell filled. It carries the trail instead
 * of the platform filter, because on this surface the aisle you are standing in
 * is the vendor, not the operating system.
 */

export interface Stop {
  label: string;
  href?: string;
}

export function AisleBand({ trail, who }: { trail: Stop[]; who: string | null }) {
  return (
    <nav className="zones admBand" aria-label="Where you are">
      {trail.map((stop, i) => {
        const current = i === trail.length - 1;
        const content = (
          <>
            <span className="tag mono">{stop.label}</span>
          </>
        );
        return stop.href && !current ? (
          <Link key={stop.label + i} href={stop.href} className="zone admBand__cell">
            {content}
          </Link>
        ) : (
          <span key={stop.label + i} className="zone admBand__cell" aria-current="true">
            {content}
          </span>
        );
      })}
      <span className="zones__legend tag mono">
        {who ? `Signed in · ${who}` : "Not signed in"}
        {who && (
          // The platform owns the session, so signing out is its endpoint, not
          // ours. A plain link rather than a form: it is a GET, and it has to
          // work even when the bench itself is refusing you.
          <a className="admSignOut tag mono" href="/.auth/logout?post_logout_redirect_uri=%2F">
            Sign out
          </a>
        )}
      </span>
    </nav>
  );
}

/**
 * The bay header: the record's name at bench scale, its machine-true facts set
 * beside it in mono, and whatever commits or destroys it hard to the right.
 */
export function BayHead({
  name,
  facts,
  actions,
  back,
}: {
  name: string;
  facts?: React.ReactNode;
  actions?: React.ReactNode;
  back?: Stop;
}) {
  return (
    <div className="admBay">
      <div className="admBay__id">
        {back?.href && (
          <Link href={back.href} className="admBay__back tag mono">
            <IconCorner size={13} />
            {back.label}
          </Link>
        )}
        <h1 className="admBay__h">{name}</h1>
        {facts && <p className="admBay__facts tag mono">{facts}</p>}
      </div>
      {actions && <div className="admBay__acts">{actions}</div>}
    </div>
  );
}

/**
 * The two-column rack: the aisle you are in on the left, the record on the
 * right. Below 1080px the record comes first and the rail follows it, the same
 * inversion the results page makes - the thing you came to work on is never
 * pushed under its own index.
 */
export function Aisle({ rail, children }: { rail: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="admAisle">
      <details className="admRail" open>
        {rail}
      </details>
      <div className="admWork">{children}</div>
    </div>
  );
}

export function RailHead({
  children,
  legend,
}: {
  children: React.ReactNode;
  /** What the count column on each row is counting. Wide viewports only. */
  legend?: React.ReactNode;
}) {
  return (
    <summary className="rackHead admRail__sum">
      <span className="tag mono">{children}</span>
      {legend && <span className="tag mono admRail__legend">{legend}</span>}
      <span className="tag mono admRail__chev" aria-hidden>
        Open / close
      </span>
    </summary>
  );
}

export function RailRow({
  href,
  name,
  meta,
  current = false,
}: {
  href: string;
  name: string;
  meta: React.ReactNode;
  current?: boolean;
}) {
  return (
    <Link href={href} className="admRail__row" aria-current={current ? "true" : undefined}>
      <span className="admRail__name">{name}</span>
      <span className="tag mono admRail__meta">{meta}</span>
    </Link>
  );
}

/** Which platforms a record covers - colour, fill pattern and a three-letter code. */
export function ZoneTags({ platforms }: { platforms: Platform[] }) {
  if (!platforms.length) return <span className="tag mono">No paths</span>;
  return (
    <span className="admZones">
      {PLATFORM_META.filter((m) => platforms.includes(m.id)).map((m) => (
        <span key={m.id} className="zonetag tag mono">
          <ZoneSwatch zone={m.id} size={9} />
          {m.code}
        </span>
      ))}
    </span>
  );
}
