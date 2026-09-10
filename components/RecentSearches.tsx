"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconCorner } from "./Icons";
import { clearRecent, readRecent, type RecentSearch } from "@/lib/recent";
import type { Platform } from "@/lib/api";

/** The pick list: what this browser looked up, held in this browser. */
export function RecentSearches({ platform }: { platform: Platform | "all" }) {
  const [items, setItems] = useState<RecentSearch[] | null>(null);

  useEffect(() => {
    const sync = () => setItems(readRecent());
    sync();
    window.addEventListener("wtla:recent", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("wtla:recent", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <section className="rackCol" aria-labelledby="recent-h">
      <div className="rackHead">
        <h2 className="tag mono" id="recent-h" style={{ margin: 0 }}>
          Recent searches
        </h2>
        {items && items.length > 0 && (
          <button
            type="button"
            className="tag mono"
            onClick={clearRecent}
            style={{ background: "none", border: 0, cursor: "pointer", color: "var(--bone-faint)" }}
          >
            Clear
          </button>
        )}
      </div>

      {items === null ? (
        <p className="rackNote" style={{ margin: 0 }}>
          Reading this browser&hellip;
        </p>
      ) : items.length === 0 ? (
        <div className="rackNote">
          <p style={{ margin: 0 }}>Nothing picked yet. Searches you run will print here.</p>
          <p style={{ margin: 0 }}>
            This list is written to your browser&rsquo;s local storage and never leaves this
            device. It is not a cookie and it is not sent to the server.
          </p>
        </div>
      ) : (
        <ul className="picks">
          {items.map((r) => (
            <li key={r.q} className="pick">
              <Link
                className="pick__link"
                href={`/search?q=${encodeURIComponent(r.q)}&platform=${platform}`}
              >
                <span className="pick__q">{r.q}</span>
                <IconCorner size={14} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
