import { summary } from "@/lib/server/catalog";
import { json, toResponse } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(200, await summary(), {
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch (err) {
    return toResponse(err);
  }
}
