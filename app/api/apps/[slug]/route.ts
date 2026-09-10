import { getSnapshot } from "@/lib/server/catalog";
import { json, notFound, toResponse } from "@/lib/server/errors";
import { resolveApp } from "@/lib/model";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { apps, vendors } = await getSnapshot();
    const found = apps.find((a) => a.slug === slug);
    if (!found) throw notFound(`App "${slug}"`);
    return json(200, resolveApp(found, vendors.get(found.vendorId)), {
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    });
  } catch (err) {
    return toResponse(err);
  }
}
