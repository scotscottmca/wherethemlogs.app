"use client";

import { RECENT_KEY } from "./site";

export type RecentSearch = { q: string; at: number };

/**
 * Recent searches live in this browser only — never sent anywhere, and not a
 * cookie. The privacy sheet says the same thing in the same words.
 */
export function readRecent(): RecentSearch[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is RecentSearch =>
        typeof r === "object" && r !== null &&
        typeof (r as RecentSearch).q === "string" &&
        typeof (r as RecentSearch).at === "number",
      )
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function pushRecent(q: string): RecentSearch[] {
  const term = q.trim();
  if (!term) return readRecent();
  const next = [{ q: term, at: Date.now() }, ...readRecent().filter((r) => r.q !== term)].slice(0, 8);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("wtla:recent"));
  } catch {
    /* Storage disabled or full — the list simply does not persist. */
  }
  return next;
}

export function clearRecent() {
  try {
    window.localStorage.removeItem(RECENT_KEY);
    window.dispatchEvent(new CustomEvent("wtla:recent"));
  } catch {
    /* no-op */
  }
}
