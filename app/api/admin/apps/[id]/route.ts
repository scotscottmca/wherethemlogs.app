import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { invalidate } from "@/lib/server/catalog";
import { apps as appsContainer, vendors } from "@/lib/server/cosmos";
import { badRequest, json, notFound, toResponse } from "@/lib/server/errors";
import type { App, Vendor } from "@/lib/model";
import { partitionFor } from "@/lib/server/partition";
import { parseApp } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

function ifMatch(request: Request): string | undefined {
  const value = request.headers.get("if-match");
  return value && value !== "*" ? value : undefined;
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const vendorId = await partitionFor(id, request.nextUrl.searchParams.get("vendorId"));
    const { resource } = await appsContainer().item(id, vendorId).read<App>();
    if (!resource) throw notFound(`App "${id}"`);
    return json(200, resource, { etag: resource._etag ?? "" });
  } catch (err) {
    return toResponse(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const patch = parseApp(await request.json(), { partial: true });
    const vendorId = await partitionFor(id, request.nextUrl.searchParams.get("vendorId"));

    const { resource: current } = await appsContainer().item(id, vendorId).read<App>();
    if (!current) throw notFound(`App "${id}"`);

    // Moving an app between vendors changes its partition key, which Cosmos
    // cannot do in place: it is a create in the new partition and a delete
    // from the old one.
    const movingTo = patch.vendorId && patch.vendorId !== current.vendorId ? patch.vendorId : null;
    if (movingTo) {
      const { resource: target } = await vendors().item(movingTo, movingTo).read<Vendor>();
      if (!target) throw badRequest(`Vendor "${movingTo}" does not exist.`);
    }

    const next: App = {
      ...current,
      ...patch,
      id: current.id,
      vendorId: movingTo ?? current.vendorId,
      logPaths: current.logPaths,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (movingTo) {
      const { resource } = await appsContainer().items.create(next);
      await appsContainer().item(id, current.vendorId).delete();
      invalidate();
      return json(200, resource);
    }

    const { resource } = await appsContainer()
      .item(id, vendorId)
      .replace(next, { accessCondition: { type: "IfMatch", condition: ifMatch(request) ?? current._etag! } });

    invalidate();
    return json(200, resource);
  } catch (err) {
    return toResponse(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const vendorId = await partitionFor(id, request.nextUrl.searchParams.get("vendorId"));

    // Log paths are embedded, so they go with the app. No orphans are possible.
    await appsContainer().item(id, vendorId).delete();
    invalidate();
    return json(200, { deleted: { app: id } });
  } catch (err) {
    return toResponse(err);
  }
}

export { PATCH as PUT };
