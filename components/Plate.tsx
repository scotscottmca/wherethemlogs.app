"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCopy, IconCheck, IconFlag } from "./Icons";
import type { Entry } from "@/lib/catalog";
import { correctionUrl } from "@/lib/site";

const ARCH = new Set(["x86", "x64", "arm64"]);
const SCOPE = new Set(["per-user", "per-machine", "system"]);

const ZONE_CODE: Record<Entry["platform"], string> = {
  windows: "WIN",
  macos: "MAC",
  linux: "LNX",
};

/**
 * The label plate. Zone band down the left, app in condensed caps, every path
 * stacked against one vertical rule, qualifiers printed as tags along the foot.
 */
export function Plate({
  entry,
  index = 0,
  animate = false,
  selected = false,
  id,
}: {
  entry: Entry;
  index?: number;
  animate?: boolean;
  selected?: boolean;
  id?: string;
}) {
  // Scan to confirm: the whole plate inverts, the way a scanned label lights up.
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const confirm = useCallback((label: string) => {
    setConfirmed(label);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setConfirmed(null), 1800);
  }, []);

  return (
    <article
      id={id}
      className={`plate${selected ? " plate--sel" : ""}${confirmed ? " plate--done" : ""}${
        animate ? " rack-in" : ""
      }`}
      style={animate ? ({ ["--i" as string]: index } as React.CSSProperties) : undefined}
    >
      <div className="plate__zone" data-zone={entry.platform}>
        <span className="plate__zoneCode">{ZONE_CODE[entry.platform]}</span>
      </div>

      <div className="plate__body">
        <div className="plate__top">
          <h3 className="plate__name">{entry.app}</h3>
          {entry.variant && <span className="tag mono plate__variant">{entry.variant}</span>}
          <span className="tag mono plate__vendor">{entry.vendor}</span>
          {confirmed && (
            <span className="plate__confirm mono" role="status">
              <IconCheck size={14} />
              {confirmed} on the clipboard
            </span>
          )}
        </div>

        <div className="plate__paths">
          {entry.paths.map((p) => (
            <PathRow
              key={p.path}
              label={p.label}
              path={p.path}
              note={p.note}
              onConfirm={confirm}
            />
          ))}
        </div>

        <div className="plate__foot">
          <div className="chips">
            {entry.types.map((t) => (
              <span
                key={t}
                className={`chip tag mono${ARCH.has(t) ? " chip--arch" : ""}${
                  SCOPE.has(t) ? " chip--scope" : ""
                }`}
              >
                {t}
              </span>
            ))}
          </div>
          <a
            className="plate__flag tag mono"
            href={correctionUrl(entry.app, ZONE_CODE[entry.platform])}
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

/** Scan to confirm: the row inverts to solid high-vis, path still black on yellow. */
function PathRow({
  label,
  path,
  note,
  onConfirm,
}: {
  label: string;
  path: string;
  note?: string;
  onConfirm: (label: string) => void;
}) {
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
        {note && <span className="prow__note">— {note}</span>}
        {failed && (
          <span className="prow__note" role="status">
            — Clipboard unavailable in this browser. Select the path above and copy it.
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
        Scan
      </button>
    </div>
  );
}
