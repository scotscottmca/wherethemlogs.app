import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { invalidate } from "@/lib/server/catalog";
import { apps as appsContainer, vendors } from "@/lib/server/cosmos";
import { conflict, json, notFound, toResponse } from "@/lib/server/errors";
import type { App, Vendor } from "@/lib/model";
import { assertVendorSlugFree } from "@/lib/server/slugs";
import { parseVendor } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

/** Cosmos rejects a write whose etag has moved on, so two editors cannot clobber each other. */
function ifMatch(request: Request): string | undefined {
  const value = request.headers.get("if-match");
  return value && value !== "*" ? value : undefined;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const { resource } = await vendors().item(id, id).read<Vendor>();
    if (!resource) throw notFound(`Vendor "${id}"`);
    return json(200, resource, { etag: resource._etag ?? "" });
  } catch (err) {
    return toResponse(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const patch = parseVendor(await request.json(), { partial: true });

    const { resource: current } = await vendors().item(id, id).read<Vendor>();
    if (!current) throw notFound(`Vendor "${id}"`);

    if (patch.slug && patch.slug !== current.slug) await assertVendorSlugFree(patch.slug, id);

    const next: Vendor = {
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await vendors()
      .item(id, id)
      .replace(next, { accessCondition: { type: "IfMatch", condition: ifMatch(request) ?? current._etag! } });

    invalidate();
    return json(200, resource);
  } catch (err) {
    return toResponse(err);
  }
}

/**
 * A vendor with apps is refused rather than silently orphaning them.
 * `?cascade=true` is the deliberate second press.
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const cascade = request.nextUrl.searchParams.get("cascade") === "true";

    const { resource: current } = await vendors().item(id, id).read<Vendor>();
    if (!current) throw notFound(`Vendor "${id}"`);

    const { resources: owned } = await appsContainer().items
      .query<App>({
        query: "SELECT c.id, c.name FROM c WHERE c.vendorId = @vendorId",
        parameters: [{ name: "@vendorId", value: id }],
      })
      .fetchAll();

    if (owned.length && !cascade) {
      throw conflict(
        `"${current.name}" still owns ${owned.length} app${owned.length === 1 ? "" : "s"}. ` +
          "Move them to another vendor, or repeat with ?cascade=true to delete them as well.",
        { apps: owned.map((a) => ({ id: a.id, name: a.name })) },
      );
    }

    for (const ownedApp of owned) {
      await appsContainer().item(ownedApp.id, id).delete();
    }
    await vendors().item(id, id).delete();

    invalidate();
    return json(200, { deleted: { vendor: id, apps: owned.map((a) => a.id) } });
  } catch (err) {
    return toResponse(err);
  }
}

export { PATCH as PUT };
