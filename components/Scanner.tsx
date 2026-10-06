"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconSearch, IconClose, IconArrow } from "./Icons";
import { Plate } from "./Plate";
import { pushRecent } from "@/lib/recent";
import { SLASH_KEY, requestAppUrl } from "@/lib/site";
import { searchApps, toPlates, type Plate as PlateData, type Platform } from "@/lib/api";

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
  const [hits, setHits] = useState<PlateData[]>([]);
  const [state, setState] = useState<State>("idle");
  const [cursor, setCursor] = useState(0);

  // "/" focuses the field from anywhere, the way every tool this audience
  // already lives in behaves. A single-key shortcut has to be switchable off
  // (WCAG 2.1.4), so the hint carries the switch and the choice is remembered.
  const [slash, setSlash] = useState(true);
  useEffect(() => {
    try {
      setSlash(window.localStorage.getItem(SLASH_KEY) !== "off");
    } catch {
      /* Storage blocked: the shortcut stays on for this visit. */
    }
  }, []);
  const toggleSlash = () => {
    const next = !slash;
    setSlash(next);
    try {
      window.localStorage.setItem(SLASH_KEY, next ? "on" : "off");
    } catch {
      /* Applies to this visit only. */
    }
  };
  useEffect(() => {
    if (!slash) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slash]);

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
      searchApps({ q: term, platform, limit: 5 }, { signal: ctl.signal })
        .then((data) => {
          setHits(toPlates(data.results).slice(0, 5));
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
  const copyFirstPath = useCallback((plate: PlateData) => {
    const path = plate.logPaths[0]?.path;
    if (!path) return;
    navigator.clipboard
      .writeText(path)
      .then(() => setFlash(`${plate.app.name} - ${path} copied`))
      .catch(() => setFlash("Clipboard unavailable - select the path and copy it"));
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
        <IconSearch size={22} />
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
          placeholder="Search for an app - teams, vscode, nginx…"
          onChange={(e) => {
            setTouched(true);
            setQ(e.target.value);
          }}
          onKeyDown={onKeyDown}
          aria-describedby={`${listId}-hint`}
          aria-controls={showRack ? `${listId}-rack` : undefined}
        />
        {q && (
          <button type="button" className="scan__clear" onClick={() => { setTouched(true); setQ(""); }} aria-label="Clear the field">
            <IconClose size={18} />
          </button>
        )}
        <span className="scan__hint tag mono" id={`${listId}-hint`}>
          {slash && (
            <>
              <span>Press</span>
              <kbd className="scan__key">/</kbd>
              <span>to search ·</span>
            </>
          )}
          <kbd className="scan__key">↵</kbd>
          <span>for all results</span>
          <button type="button" className="scan__hintBtn" aria-pressed={slash} onClick={toggleSlash}>
            / shortcut {slash ? "on" : "off"}
          </button>
        </span>
      </form>

      {showRack && (
        <div className="ahead" id={`${listId}-rack`}>
          <h2 className="visually-hidden">Suggestions</h2>
          <div className="ahead__head">
            <span className="tag mono" role="status">
              {flash ?? (
                <>
                  {state === "loading" && "Searching…"}
                  {state === "error" && "Search is offline - retry in a moment"}
                  {state === "idle" && "Ready"}
                  {state === "ready" &&
                    (hits.length
                      ? `${hits.length} shown · highlighted: ${hits[cursor]?.app.name ?? ""} · shift+↵ copies`
                      : "No matches")}
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
              <h3 className="ahead__emptyH">Nothing found for “{q.trim()}”</h3>
              <p className="ahead__emptyP">
                Check the spelling, switch the platform filter to all, or open a request and we
                will add it.
              </p>
              <a
                className="btn tag mono"
                href={requestAppUrl(q.trim())}
                style={{ color: "var(--ink)" }}
              >
                Request “{q.trim()}”
                <IconArrow size={15} />
              </a>
            </div>
          )}

          {hits.map((plate, i) => (
            <Plate
              key={plate.key}
              id={`${listId}-opt-${i}`}
              plate={plate}
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
