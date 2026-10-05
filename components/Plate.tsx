"use client";

import Link from "next/link";
import { IconFlag } from "./Icons";
import { CopyButton } from "./CopyButton";
import { PLATFORM_META, type LogPath, type Plate as PlateData, type Platform } from "@/lib/api";
import { correctionUrl } from "@/lib/site";

const ARCH = new Set(["x86", "x64", "arm64"]);
const SCOPE = new Set(["per-user", "per-machine", "system"]);

const ZONE_CODE: Record<Platform, string> = {
  windows: "WIN",
  macos: "MAC",
  linux: "LNX",
};

const PLATFORM_NAME: Record<Platform, string> = Object.fromEntries(
  PLATFORM_META.map((p) => [p.id, p.name]),
) as Record<Platform, string>;

/**
 * The label plate. Zone band down the left, app in condensed caps, every path
 * stacked against one vertical rule, qualifiers printed as tags along the foot.
 *
 * The card itself has no state of its own any more - only `CopyButton`, one
 * per path row, is interactive. It stays a client component even so: it is
 * the one place `plate`'s data is handed to the browser, and keeping that a
 * single boundary (one compact reference per card) is what stops the
 * catalogue being duplicated into the page's hydration payload. Splitting the
 * card into a server-rendered shell around several small client rows was
 * tried and measured worse - see the pull request description for the
 * numbers - because Next then has to describe the shell's own markup in that
 * payload too, in addition to each row's client boundary.
 */
export function Plate({
  plate,
  index = 0,
  animate = false,
  selected = false,
  id,
}: {
  plate: PlateData;
  index?: number;
  animate?: boolean;
  selected?: boolean;
  id?: string;
}) {
  const { app, platform, variant, logPaths } = plate;

  // Qualifiers are per path; the foot prints the union across this platform.
  const types = [...new Set(logPaths.flatMap((p) => p.types))];
  const scopes = [...new Set(logPaths.flatMap((p) => (p.scope ? [p.scope] : [])))];

  return (
    <article
      id={id}
      className={`plate${selected ? " plate--sel" : ""}${animate ? " rack-in" : ""}`}
      style={animate ? ({ ["--i" as string]: index } as React.CSSProperties) : undefined}
    >
      <div className="plate__zone" data-zone={platform}>
        <span className="plate__zoneCode">{ZONE_CODE[platform]}</span>
      </div>

      <div className="plate__body">
        <div className="plate__top">
          {app.resolvedIconUrl && (
            // Asset tag: the app's own icon, or the vendor's when it has none.
            <img
              className="plate__icon"
              src={app.resolvedIconUrl}
              alt=""
              width={22}
              height={22}
              loading="lazy"
              decoding="async"
            />
          )}
          <h3 className="plate__name">
            <Link href={`/apps/${app.slug}`} style={{ textDecoration: "none" }}>
              {app.name}
            </Link>
            {/* Visible heading text stays just the app name (the zone band already
                shows the platform); the hidden part gives each of an app's several
                cards a distinct, non-repeating name for screen readers and search
                engines. */}
            <span className="visually-hidden">
              {" - "}
              {PLATFORM_NAME[platform]}
              {variant ? ` (${variant})` : ""}
            </span>
          </h3>
          {variant && <span className="tag mono plate__variant">{variant}</span>}
          <span className="tag mono plate__vendor">{app.vendor.name}</span>
        </div>

        <div className="plate__paths">
          {logPaths.map((p) => (
            <PathRow key={p.id} logPath={p} />
          ))}
        </div>

        <div className="plate__foot">
          <div className="chips">
            {types.map((t) => (
              <span key={t} className={`chip tag mono${ARCH.has(t) ? " chip--arch" : ""}`}>
                {t}
              </span>
            ))}
            {scopes.filter((s) => SCOPE.has(s)).map((s) => (
              <span key={s} className="chip tag mono chip--scope">
                {s}
              </span>
            ))}
          </div>
          <a
            className="plate__flag tag mono"
            href={correctionUrl(app.name, ZONE_CODE[platform])}
          >
            <IconFlag size={13} />
            Wrong path? Add a variant
          </a>
        </div>
      </div>
    </article>
  );
}

function PathRow({ logPath }: { logPath: LogPath }) {
  const { label, path, note } = logPath;

  return (
    <div className="prow">
      <span className="tag mono prow__label">{label}</span>
      <code className="prow__path">
        {path}
        {note && <span className="prow__note">- {note}</span>}
      </code>
      <CopyButton path={path} label={label} />
    </div>
  );
}
