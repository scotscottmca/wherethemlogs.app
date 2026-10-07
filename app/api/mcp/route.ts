import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { getSnapshot, search } from "@/lib/server/catalog";
import { ApiError, json, notFound } from "@/lib/server/errors";
import { PLATFORMS, pathLines, resolveApp, type ResolvedApp } from "@/lib/model";

export const dynamic = "force-dynamic";

/**
 * The catalogue as an MCP server, for AI agents: Streamable HTTP, stateless,
 * plain JSON responses rather than SSE. Anonymous and read-only - it serves
 * exactly what /api/search does. GET and DELETE get Next's automatic 405,
 * which is what the spec asks of a server with no sessions.
 */

// Agents pay per token, so ids, icons and timestamps stay out.
const slim = (app: ResolvedApp) => ({
  app: app.name,
  slug: app.slug,
  vendor: app.vendor.name,
  documentation: app.documentation,
  notes: app.notes,
  enableLogging: app.enableLogging,
  collectLogs: app.collectLogs,
  logs: app.logPaths.map((p) => ({
    platform: p.platform,
    what: p.label,
    paths: pathLines(p.path),
    scope: p.scope,
    variant: p.variant,
    version: p.version,
    note: p.note,
  })),
});

const text = (value: unknown, isError = false) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value) }],
  ...(isError ? { isError } : {}),
});

/** A tool's failure is its answer; no Cosmos detail leaves the process. */
async function answer(produce: () => Promise<unknown>) {
  try {
    return text(await produce());
  } catch (err) {
    if (err instanceof ApiError) return text(err.message, true);
    console.error("mcp tool failed", err);
    return text("The catalogue is not answering. Try again in a moment.", true);
  }
}

function server() {
  const mcp = new McpServer(
    { name: "wherethemlogs", title: "Where Them Logs", version: "1.0.0" },
    {
      instructions:
        "Where application log files live on Windows, macOS and Linux. Paths are verbatim: environment variables such as %LOCALAPPDATA%, ~ and $XDG_STATE_HOME are not expanded.",
    },
  );

  mcp.registerTool(
    "search_log_locations",
    {
      title: "Search log locations",
      description:
        "Find where an application writes its log files. Matches app names and aliases (for example 'teams', 'zoom', 'docker'), not vendor names. Returns each app's log paths by platform.",
      inputSchema: {
        query: z.string().max(120).describe("App name or alias"),
        platform: z.enum(PLATFORMS).optional().describe("Only paths on this platform"),
        limit: z.number().int().min(1).max(25).default(10),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ query, platform, limit }) =>
      answer(async () => {
        const { results } = await search({ q: query, platform: platform ?? "all", types: [], limit });
        return results.map(slim);
      }),
  );

  mcp.registerTool(
    "get_app_log_locations",
    {
      title: "Get one app's log locations",
      description: "Every log location for one app, by the slug that search_log_locations returns.",
      inputSchema: { slug: z.string().max(80) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ slug }) =>
      answer(async () => {
        const { apps, vendors } = await getSnapshot();
        const app = apps.find((a) => a.slug === slug);
        if (!app) throw notFound(`App "${slug}"`);
        return slim(resolveApp(app, vendors.get(app.vendorId)));
      }),
  );

  return mcp;
}

// ponytail: trusts content-length, so a chunked body skips the cap. Stream-count
// the body if anyone starts sending those.
const MAX_BODY = 64 * 1024;

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) {
    return json(413, { error: "payload_too_large", message: "MCP requests are limited to 64 KB." });
  }
  // A stateless transport serves one request; the SDK throws if one is reused.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server().connect(transport);
  return transport.handleRequest(request);
}
