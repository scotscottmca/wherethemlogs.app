import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getSnapshot, invalidate } from "@/lib/server/catalog";
import { toResponse } from "@/lib/server/errors";
import { toFile } from "@/lib/server/interchange";

export const dynamic = "force-dynamic";

/** The whole catalogue as one file, in the format `POST /api/admin/import` reads. */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    // Straight from the store, not a snapshot up to a minute old.
    invalidate();
    const file = toFile(await getSnapshot());
    const date = new Date().toISOString().slice(0, 10);
    return new Response(`${JSON.stringify(file, null, 2)}\n`, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="wherethemlogs-export-${date}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return toResponse(err);
  }
}
