import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/server/auth";
import { badRequest, json, toResponse } from "@/lib/server/errors";
import { loadApp, saveLogPaths } from "@/lib/server/logpaths";
import type { LogPath } from "@/lib/model";
import { parseLogPath } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

function ifMatch(request: Request): string | undefined {
  const value = request.headers.get("if-match");
  return value && value !== "*" ? value : undefined;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(request);
    const { id: appId } = await params;
    const { app } = await loadApp(appId, request.nextUrl.searchParams.get("vendorId"));
    return json(200, { count: app.logPaths.length, logPaths: app.logPaths });
  } catch (err) {
    return toResponse(err);
  }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(request);
    const { id: appId } = await params;
    const input = parseLogPath(await request.json());
    const { app: current, vendorId } = await loadApp(appId, request.nextUrl.searchParams.get("vendorId"));

    const record: LogPath = {
      id: randomUUID(),
      platform: input.platform!,
      label: input.label!,
      path: input.path!,
      types: input.types ?? [],
      scope: input.scope!,
      ...(input.note ? { note: input.note } : {}),
      ...(input.variant ? { variant: input.variant } : {}),
    };

    // The same path twice on one platform is a duplicate, not a variant.
    const clash = current.logPaths.find(
      (p) => p.platform === record.platform && p.path === record.path && p.variant === record.variant,
    );
    if (clash) {
      throw badRequest("That platform already carries this exact path. Edit the existing one, or set a variant.");
    }

    const app = await saveLogPaths(current, vendorId, [...current.logPaths, record], ifMatch(request));
    return json(201, { app, logPath: record });
  } catch (err) {
    return toResponse(err);
  }
}
