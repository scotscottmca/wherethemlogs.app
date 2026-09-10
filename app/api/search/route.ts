import { NextResponse } from "next/server";
import { PLATFORMS, searchCatalog, type Platform } from "@/lib/catalog";

const VALID = new Set<string>(PLATFORMS.map((p) => p.id));

/**
 * Server-side search. The type-ahead calls this on every keystroke, so it stays
 * cheap and never trusts its query string.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 120);

  const rawPlatform = url.searchParams.get("platform") ?? "all";
  const platform: Platform | "all" = VALID.has(rawPlatform) ? (rawPlatform as Platform) : "all";

  const types = url.searchParams
    .getAll("type")
    .flatMap((t) => t.split(","))
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : undefined;

  const results = searchCatalog({ q, platform, types, limit });

  return NextResponse.json(
    { query: q, platform, types, count: results.length, results },
    { headers: { "cache-control": "no-store" } },
  );
}
