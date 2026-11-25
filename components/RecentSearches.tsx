"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clearRecent, readRecent, type RecentSearch } from "@/lib/recent";
import type { Platform } from "@/lib/api";

/**
 * What this browser looked up, held in this browser's local storage. Nothing
 * shows until there is something to show.
 */
export function RecentSearches({ platform }: { platform: Platform | "all" }) {
  const [items, setItems] = useState<RecentSearch[]>([]);

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

  if (!items.length) return null;

  return (
    <p className="added" aria-label="Recent searches">
      <span>Your recent searches:</span>
      {items.map((r) => (
        <Link key={r.q} href={`/search?q=${encodeURIComponent(r.q)}&platform=${platform}`}>
          {r.q}
        </Link>
      ))}
      <button type="button" onClick={clearRecent}>
        Clear
      </button>
    </p>
  );
}
