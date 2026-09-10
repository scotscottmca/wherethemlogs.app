"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconScan, IconClose, IconArrow } from "./Icons";
import { Plate } from "./Plate";
import { pushRecent } from "@/lib/recent";
import { requestAppUrl } from "@/lib/site";
import type { Entry, Platform } from "@/lib/catalog";

type State = "idle" | "loading" | "ready" | "error";

/**
 * The scanner field. It behaves like a command line: "/" focuses it, the arrow
 * keys walk the rack beneath it, Enter commits to the full pick list, and
 * Shift+Enter drops the highlighted path straight onto the clipboard.
 */
export function Scanner({
  platform,
  initialQuery = "",
  autoFocus = false,
}: {
  platform: Platform | "all";
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const [q, setQ] = useState(initialQuery);
  // On the results page the field arrives pre-filled; opening the rack there
  // would mirror the pick list directly beneath it.
  const [touched, setTouched] = useState(false);
  const [hits, setHits] = useState<Entry[]>([]);
  const [state, setState] = useState<State>("idle");
  const [cursor, setCursor] = useState(0);

  // "/" focuses the field from anywhere, the way every tool this audience
  // already lives in behaves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setHits([]);
      setState("idle");
      return;
    }

    const ctl = new AbortController();
    setState("loading");
    const t = setTimeout(() => {
      const url = `/api/search?q=${encodeURIComponent(term)}&platform=${platform}&limit=5`;
      fetch(url, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: { results: Entry[] }) => {
          setHits(data.results);
          setCursor(0);
          setState("ready");
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setState("error");
        });
    }, 110);

    return () => {
      ctl.abort();
      clearTimeout(t);
    };
  }, [q, platform]);

  const commit = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      pushRecent(t);
      router.push(`/search?q=${encodeURIComponent(t)}&platform=${platform}`);
    },
    [router, platform],
  );

  // Shift+Enter drops the highlighted plate's first path straight on the
  // clipboard, so a lookup can finish without the mouse ever moving.
  const [flash, setFlash] = useState<string | null>(null);
  const copyFirstPath = useCallback((entry: Entry) => {
    const path = entry.paths[0]?.path;
    if (!path) return;
    navigator.clipboard
      .writeText(path)
      .then(() => setFlash(`${entry.app} — ${path} copied`))
      .catch(() => setFlash("Clipboard unavailable — select the path and copy it"));
    setTimeout(() => setFlash(null), 2600);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && hits.length) {
      e.preventDefault();
      setCursor((c) => (c + 1) % hits.length);
    } else if (e.key === "ArrowUp" && hits.length) {
      e.preventDefault();
      setCursor((c) => (c - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey && hits[cursor]) {
        copyFirstPath(hits[cursor]);
        return;
      }
      commit(q);
    } else if (e.key === "Escape") {
      setTouched(true);
      setQ("");
    }
  };

  const showRack = touched && q.trim().length > 0;

  return (
    <section className="scan" aria-label="Search the catalogue">
      <form
        className="scan__bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          commit(q);
        }}
      >
        <IconScan size={22} />
        <label htmlFor={`${listId}-in`} className="sr">
          Application name
        </label>
        <input
          id={`${listId}-in`}
          ref={inputRef}
          className="scan__input"
          type="search"
          value={q}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          placeholder="Scan an app name — teams, vscode, nginx…"
          onChange={(e) => {
            setTouched(true);
            setQ(e.target.value);
          }}
          onKeyDown={onKeyDown}
          aria-describedby={`${listId}-hint`}
          aria-controls={`${listId}-rack`}
        />
        {q && (
          <button type="button" className="scan__clear" onClick={() => { setTouched(true); setQ(""); }} aria-label="Clear the field">
            <IconClose size={18} />
          </button>
        )}
        <span className="scan__hint tag mono" id={`${listId}-hint`}>
          <span>Press</span>
          <kbd className="scan__key">/</kbd>
          <span>to scan ·</span>
          <kbd className="scan__key">↵</kbd>
          <span>for all results</span>
        </span>
      </form>

      {showRack && (
        <div className="ahead" id={`${listId}-rack`}>
          <div className="ahead__head">
            <span className="tag mono" role="status">
              {flash ?? (
                <>
                  {state === "loading" && "Scanning…"}
                  {state === "error" && "Scanner offline — retry in a moment"}
                  {state === "idle" && "Ready"}
                  {state === "ready" &&
                    (hits.length
                      ? `${hits.length} shown · highlighted: ${hits[cursor]?.app ?? ""} · shift+↵ copies`
                      : "No plate on this rack")}
                </>
              )}
            </span>
            {state === "ready" && hits.length > 0 && (
              <Link href={`/search?q=${encodeURIComponent(q.trim())}&platform=${platform}`} className="ahead__all tag mono">
                All results
                <IconArrow size={14} />
              </Link>
            )}
          </div>

          {state === "ready" && hits.length === 0 && (
            <div className="ahead__empty">
              <h3 className="ahead__emptyH">Nothing racked under “{q.trim()}”</h3>
              <p className="ahead__emptyP">
                Check the spelling, widen the zone filter, or open a request and we will
                rack it.
              </p>
              <a
                className="btn tag mono"
                href={requestAppUrl(q.trim())}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--ink)" }}
              >
                Request “{q.trim()}”
                <IconArrow size={15} />
              </a>
            </div>
          )}

          {hits.map((e, i) => (
            <Plate
              key={e.id}
              id={`${listId}-opt-${i}`}
              entry={e}
              index={i}
              animate
              selected={i === cursor}
            />
          ))}
        </div>
      )}
    </section>
  );
}
