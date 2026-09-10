import { getSnapshot } from "@/lib/server/catalog";
import { json } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

/** The container's readiness probe and the deploy workflow's gate. */
export async function GET() {
  try {
    const { apps, vendors } = await getSnapshot();
    return json(200, { status: "ok", apps: apps.length, vendors: vendors.size });
  } catch {
    return json(503, { status: "degraded", message: "The catalogue store is unreachable." });
  }
}
