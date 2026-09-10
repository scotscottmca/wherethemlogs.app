import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { search, summary, getSnapshot } from "../lib/catalog";
import { json, notFound, toResponse } from "../lib/errors";
import { PLATFORMS, resolveApp, type Platform } from "../lib/model";

const PLATFORM_SET = new Set<string>(PLATFORMS);

/** Read endpoints are anonymous and cacheable; nothing here is per-visitor. */
const PUBLIC_CACHE = { "cache-control": "public, max-age=60, stale-while-revalidate=300" };

function readFilters(request: HttpRequest) {
  const params = request.query;
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

  return { platform, types, limit };
}

async function handleSearch(request: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const q = (request.query.get("q") ?? "").slice(0, 120);
    const { platform, types, limit } = readFilters(request);
    const { results, matched } = await search({ q, platform, types, limit });

    return json(200, { query: q, platform, types, count: results.length, matched, results }, PUBLIC_CACHE);
  } catch (err) {
    return toResponse(err);
  }
}

async function handleSummary(): Promise<HttpResponseInit> {
  try {
    return json(200, await summary(), PUBLIC_CACHE);
  } catch (err) {
    return toResponse(err);
  }
}

async function handleVendors(): Promise<HttpResponseInit> {
  try {
    const { vendors } = await getSnapshot();
    const rows = [...vendors.values()]
      .map(({ _etag, ...v }) => v)
      .sort((a, b) => a.name.localeCompare(b.name));
    return json(200, { count: rows.length, vendors: rows }, PUBLIC_CACHE);
  } catch (err) {
    return toResponse(err);
  }
}

async function handleApp(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    const slug = request.params.slug;
    const { apps, vendors } = await getSnapshot();
    const found = apps.find((a) => a.slug === slug);
    if (!found) throw notFound(`App "${slug}"`);
    return json(200, resolveApp(found, vendors.get(found.vendorId)), PUBLIC_CACHE);
  } catch (err) {
    return toResponse(err);
  }
}

app.http("search", {
  route: "search",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handleSearch,
});

app.http("summary", {
  route: "summary",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handleSummary,
});

app.http("vendors", {
  route: "vendors",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handleVendors,
});

app.http("appBySlug", {
  route: "apps/{slug}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: handleApp,
});

app.http("health", {
  route: "health",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (): Promise<HttpResponseInit> => {
    try {
      const { apps, vendors } = await getSnapshot();
      return json(200, { status: "ok", apps: apps.length, vendors: vendors.size });
    } catch {
      return json(503, { status: "degraded", message: "The catalogue store is unreachable." });
    }
  },
});
