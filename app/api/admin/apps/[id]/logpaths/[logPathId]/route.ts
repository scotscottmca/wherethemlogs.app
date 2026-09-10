import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { json, notFound, toResponse } from "@/lib/server/errors";
import { loadApp, saveLogPaths } from "@/lib/server/logpaths";
import type { LogPath } from "@/lib/model";
import { parseLogPath } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

function ifMatch(request: Request): string | undefined {
  const value = request.headers.get("if-match");
  return value && value !== "*" ? value : undefined;
}

type Ctx = { params: Promise<{ id: string; logPathId: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(request);
    const { id: appId, logPathId } = await params;
    const patch = parseLogPath(await request.json(), { partial: true });
    const { app: current, vendorId } = await loadApp(appId, request.nextUrl.searchParams.get("vendorId"));

    const index = current.logPaths.findIndex((p) => p.id === logPathId);
    if (index === -1) throw notFound(`Log path "${logPathId}"`);

    const merged: LogPath = { ...current.logPaths[index]!, ...patch, id: logPathId };
    const next = [...current.logPaths];
    next[index] = merged;

    const app = await saveLogPaths(current, vendorId, next, ifMatch(request));
    return json(200, { app, logPath: merged });
  } catch (err) {
    return toResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(request);
    const { id: appId, logPathId } = await params;
    const { app: current, vendorId } = await loadApp(appId, request.nextUrl.searchParams.get("vendorId"));

    const next = current.logPaths.filter((p) => p.id !== logPathId);
    if (next.length === current.logPaths.length) throw notFound(`Log path "${logPathId}"`);

    const app = await saveLogPaths(current, vendorId, next, ifMatch(request));
    return json(200, { app, deleted: { logPath: logPathId } });
  } catch (err) {
    return toResponse(err);
  }
}

export { PATCH as PUT };
