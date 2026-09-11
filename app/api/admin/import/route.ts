import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSnapshot, invalidate } from "@/lib/server/catalog";
import { badRequest, json, toResponse } from "@/lib/server/errors";
import { applyImport, planImport } from "@/lib/server/interchange";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Previews by default. `?apply=true` writes - and recomputes the plan against
 * the store as it is at that moment, rather than trusting the preview.
 */
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const tooBig = () => badRequest("Imports are limited to 5 MB. Split the file by vendor.");
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) throw tooBig();
    const text = await request.text();
    if (text.length > MAX_BYTES) throw tooBig();

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (err) {
      throw badRequest(`That file is not valid JSON - ${(err as Error).message}.`);
    }

    invalidate();
    const { plan, writes } = planImport(raw, await getSnapshot());

    if (request.nextUrl.searchParams.get("apply") !== "true") return json(200, { plan, applied: 0 });
    if (plan.errors.length) {
      throw badRequest(
        `The file has ${plan.errors.length} problem${plan.errors.length === 1 ? "" : "s"}. Nothing was written.`,
        { plan },
      );
    }
    return json(200, { plan, applied: await applyImport(writes) });
  } catch (err) {
    return toResponse(err);
  }
}
