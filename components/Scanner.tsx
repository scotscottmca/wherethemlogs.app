"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconClose, IconArrow } from "./Icons";
import { pushRecent } from "@/lib/recent";
import { pathLines } from "@/lib/model";
import { SLASH_KEY, requestAppUrl } from "@/lib/site";
import {
  PLATFORM_META,
  searchApps,
  toPlates,
  type Plate as PlateData,
  type Platform,
  type ResolvedApp,
} from "@/lib/api";

type State = "idle" | "loading" | "ready" | "error";

/**
 * The search field. "/" focuses it and typing lists the matching apps under
 * it, each a link to its app page showing its first path. Arrow keys walk the list, Enter opens the
 * highlighted app, or every result when nothing is highlighted, and
 * Shift+Enter drops the best match's first path straight onto the clipboard.
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
  const fieldRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const [q, setQ] = useState(initialQuery);
  // On the results page the field arrives pre-filled; the list stays shut
  // until the visitor types, or it would cover the results it repeats.
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<ResolvedApp[]>([]);
  const [state, setState] = useState<State>("idle");
  // -1 is "nothing highlighted": Enter then means "all results".
  const [cursor, setCursor] = useState(-1);

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

  // The list floats over the page, so a click anywhere else puts it away.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!fieldRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setApps([]);
      setState("idle");
      return;
    }

    const ctl = new AbortController();
    setState("loading");
    const t = setTimeout(() => {
      searchApps({ q: term, platform, limit: 6 }, { signal: ctl.signal })
        .then((data) => {
          setApps(data.results.slice(0, 6));
          setCursor(-1);
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

  // The best match, on its first platform or the one being filtered to: Shift+Enter copies its path.
  const top: PlateData | undefined = apps.length
    ? toPlates([apps[0]]).find((p) => platform === "all" || p.platform === platform)
    : undefined;

  const commit = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      pushRecent(t);
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(t)}&platform=${platform}`);
    },
    [router, platform],
  );

  const [flash, setFlash] = useState<string | null>(null);
  const copyTopPath = useCallback(() => {
    const first = top?.logPaths[0];
    const path = first && pathLines(first.path)[0];
    if (!top || !path) return;
    navigator.clipboard
      .writeText(path)
      .then(() => setFlash(`${top.app.name} - ${path} copied`))
      .catch(() => setFlash("Clipboard unavailable - select the path and copy it"));
    setTimeout(() => setFlash(null), 2600);
  }, [top]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && apps.length) {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => (c + 1) % apps.length);
    } else if (e.key === "ArrowUp" && apps.length) {
      e.preventDefault();
      setCursor((c) => (c <= 0 ? apps.length - 1 : c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) return copyTopPath();
      if (open && cursor >= 0 && apps[cursor]) {
        setOpen(false);
        router.push(`/apps/${apps[cursor].slug}`);
        return;
      }
      commit(q);
    } else if (e.key === "Escape") {
      // First press puts the list away; the next clears the field.
      if (open) setOpen(false);
      else setQ("");
    }
  };

  const term = q.trim();
  const showList = open && term.length > 0;

  return (
    <section className="scan" aria-label="Search the catalogue">
      <div className="scan__field" ref={fieldRef}>
        <form
          className="scan__bar"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            commit(q);
          }}
        >
          <span className="scan__tab" aria-hidden="true">
            Find an app
          </span>
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
              setOpen(true);
              setQ(e.target.value);
            }}
            onKeyDown={onKeyDown}
            aria-describedby={`${listId}-hint`}
            aria-controls={showList ? `${listId}-list` : undefined}
          />
          {q && (
            <button
              type="button"
              className="scan__clear"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label="Clear the field"
            >
              <IconClose size={18} />
            </button>
          )}
          <button type="submit" className="scan__go">
            Search
          </button>
        </form>

        {showList && (
          <div className="ahead" id={`${listId}-list`}>
            <h2 className="visually-hidden">Suggestions</h2>
            <div className="ahead__head">
              <span className="tag" role="status">
                {flash ?? (
                  <>
                    {state === "loading" && "Searching…"}
                    {state === "error" && "Search is offline - retry in a moment"}
                    {state === "idle" && "Ready"}
                    {state === "ready" &&
                      (apps.length
                        ? cursor >= 0
                          ? `Enter opens ${apps[cursor]?.name ?? ""}`
                          : `${apps.length} ${apps.length === 1 ? "app" : "apps"} shown`
                        : "No matches")}
                  </>
                )}
              </span>
              {state === "ready" && apps.length > 0 && (
                <Link
                  href={`/search?q=${encodeURIComponent(term)}&platform=${platform}`}
                  className="ahead__all tag"
                  onClick={() => pushRecent(term)}
                >
                  All results
                  <IconArrow size={14} />
                </Link>
              )}
            </div>

            {state === "ready" && apps.length === 0 && (
              <div className="ahead__empty">
                <h3 className="ahead__emptyH">Nothing found for “{term}”</h3>
                <p className="ahead__emptyP">
                  Check the spelling, switch the platform filter to all, or open a request and we
                  will add it.
                </p>
                <a className="btn" href={requestAppUrl(term)}>
                  Request “{term}”
                  <IconArrow size={15} />
                </a>
              </div>
            )}

            {apps.length > 0 && (
              <ul className="ahead__list">
                {apps.map((app, i) => {
                  const first = app.logPaths.find((p) => platform === "all" || p.platform === platform);
                  return (
                    <li key={app.id}>
                      <Link
                        href={`/apps/${app.slug}`}
                        className={`ahead__row${cursor === i ? " ahead__row--sel" : ""}`}
                      >
                        <span className="ahead__name">
                          <span>
                            <b>{app.name}</b> <span className="ahead__vendor">{app.vendor.name}</span>
                          </span>
                          {first && <span className="ahead__path">{pathLines(first.path)[0]}</span>}
                        </span>
                        <span className="ahead__os">
                          {PLATFORM_META.filter((m) => app.platforms.includes(m.id))
                            .map((m) => m.name)
                            .join(" · ")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="scan__hint" id={`${listId}-hint`}>
        {slash && (
          <span className="scan__hintItem">
            <kbd className="scan__key">/</kbd> to search
          </span>
        )}
        <span className="scan__hintItem">
          <kbd className="scan__key">Enter</kbd> for all results
        </span>
        <span className="scan__hintItem">
          <kbd className="scan__key">Shift</kbd>
          <kbd className="scan__key">Enter</kbd> copies the top path
        </span>
        <button type="button" className="scan__hintBtn" aria-pressed={slash} onClick={toggleSlash}>
          / shortcut {slash ? "on" : "off"}
        </button>
      </p>
    </section>
  );
}
