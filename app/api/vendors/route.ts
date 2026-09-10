import { getSnapshot } from "@/lib/server/catalog";
import { json, toResponse } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { vendors } = await getSnapshot();
    const rows = [...vendors.values()]
      .map(({ _etag, ...v }) => v)
      .sort((a, b) => a.name.localeCompare(b.name));
    return json(200, { count: rows.length, vendors: rows }, {
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch (err) {
    return toResponse(err);
  }
}
