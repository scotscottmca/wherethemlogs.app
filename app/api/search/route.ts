import type { NextRequest } from "next/server";
import { search } from "@/lib/server/catalog";
import { json, toResponse } from "@/lib/server/errors";
import { PLATFORMS, type Platform } from "@/lib/model";

export const dynamic = "force-dynamic";

const PLATFORM_SET = new Set<string>(PLATFORMS);

/**
 * The browser's type-ahead calls this on every keystroke. Server-rendered
 * pages do not — they call `search()` directly, with no HTTP hop.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const q = (params.get("q") ?? "").slice(0, 120);

    const rawPlatform = params.get("platform") ?? "all";
    const platform: Platform | "all" = PLATFORM_SET.has(rawPlatform) ? (rawPlatform as Platform) : "all";

    const types = params
      .getAll("type")
      .flatMap((t) => t.split(","))
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);

    const parsedLimit = Number.parseInt(params.get("limit") ?? "", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : undefined;

    const { results, matched } = await search({ q, platform, types, limit });

    return json(
      200,
      { query: q, platform, types, count: results.length, matched, results },
      { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
    );
  } catch (err) {
    return toResponse(err);
  }
}
