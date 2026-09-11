import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/server/auth";
import { invalidate } from "@/lib/server/catalog";
import { apps as appsContainer, vendors } from "@/lib/server/cosmos";
import { badRequest, json, toResponse } from "@/lib/server/errors";
import type { App, Vendor } from "@/lib/model";
import { assertAppSlugFree } from "@/lib/server/slugs";
import { parseApp } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const vendorId = request.nextUrl.searchParams.get("vendorId");

    // Filtering by vendor stays inside one partition, which is the whole point
    // of that partition key.
    const query = vendorId
      ? {
          query: "SELECT * FROM c WHERE c.vendorId = @vendorId ORDER BY c.name",
          parameters: [{ name: "@vendorId", value: vendorId }],
        }
      : { query: "SELECT * FROM c ORDER BY c.name" };

    const { resources } = await appsContainer().items.query<App>(query).fetchAll();
    return json(200, { count: resources.length, apps: resources });
  } catch (err) {
    return toResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const input = parseApp(await request.json());

    const { resource: vendor } = await vendors().item(input.vendorId!, input.vendorId!).read<Vendor>();
    if (!vendor) throw badRequest(`Vendor "${input.vendorId}" does not exist.`);

    await assertAppSlugFree(input.slug!);

    const now = new Date().toISOString();
    const record: App = {
      id: randomUUID(),
      vendorId: input.vendorId!,
      slug: input.slug!,
      name: input.name!,
      aliases: input.aliases ?? [],
      iconUrl: input.iconUrl ?? null,
      ...(input.documentation ? { documentation: input.documentation } : {}),
      ...(input.notes?.length ? { notes: input.notes } : {}),
      logPaths: [],
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await appsContainer().items.create(record);
    invalidate();
    return json(201, resource, { location: `/api/admin/apps/${record.id}` });
  } catch (err) {
    return toResponse(err);
  }
}
