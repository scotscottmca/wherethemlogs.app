"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCopy, IconCheck, IconFlag } from "./Icons";
import type { LogPath, Plate as PlateData, Platform } from "@/lib/api";
import { correctionUrl } from "@/lib/site";

const ARCH = new Set(["x86", "x64", "arm64"]);
const SCOPE = new Set(["per-user", "per-machine", "system"]);

const ZONE_CODE: Record<Platform, string> = {
  windows: "WIN",
  macos: "MAC",
  linux: "LNX",
};

/**
 * The label plate. Zone band down the left, app in condensed caps, every path
 * stacked against one vertical rule, qualifiers printed as tags along the foot.
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

  // Scan to confirm: the whole plate inverts, the way a scanned label lights up.
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const confirm = useCallback((label: string) => {
    setConfirmed(label);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setConfirmed(null), 1800);
  }, []);

  // Qualifiers are per path; the foot prints the union across this platform.
  const types = [...new Set(logPaths.flatMap((p) => p.types))];
  const scopes = [...new Set(logPaths.flatMap((p) => (p.scope ? [p.scope] : [])))];

  return (
    <article
      id={id}
      className={`plate${selected ? " plate--sel" : ""}${confirmed ? " plate--done" : ""}${
        animate ? " rack-in" : ""
      }`}
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
          <h3 className="plate__name">{app.name}</h3>
          {variant && <span className="tag mono plate__variant">{variant}</span>}
          <span className="tag mono plate__vendor">{app.vendor.name}</span>
          {confirmed && (
            <span className="plate__confirm mono" role="status">
              <IconCheck size={14} />
              {confirmed} on the clipboard
            </span>
          )}
        </div>

        <div className="plate__paths">
          {logPaths.map((p) => (
            <PathRow key={p.id} logPath={p} onConfirm={confirm} />
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
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconFlag size={13} />
            Wrong path? Add a variant
          </a>
        </div>
      </div>
    </article>
  );
}

function PathRow({
  logPath,
  onConfirm,
}: {
  logPath: LogPath;
  onConfirm: (label: string) => void;
}) {
  const { label, path, note } = logPath;
  const [failed, setFailed] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(path);
      setFailed(false);
      onConfirm(label);
    } catch {
      // Clipboard is blocked (insecure origin, denied permission). Say so and
      // leave the path selected so it can be copied by hand.
      setFailed(true);
    }
  }, [path, label, onConfirm]);

  return (
    <div className="prow">
      <span className="tag mono prow__label">{label}</span>
      <code className="prow__path">
        {path}
        {note && <span className="prow__note">- {note}</span>}
        {failed && (
          <span className="prow__note" role="status">
            - Clipboard unavailable in this browser. Select the path above and copy it.
          </span>
        )}
      </code>
      <button
        type="button"
        className="prow__copy tag mono"
        onClick={copy}
        aria-label={`Copy the ${label} path`}
      >
        <IconCopy size={13} />
        Copy
      </button>
    </div>
  );
}
