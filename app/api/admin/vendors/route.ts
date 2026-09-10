import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/server/auth";
import { invalidate } from "@/lib/server/catalog";
import { vendors } from "@/lib/server/cosmos";
import { json, toResponse } from "@/lib/server/errors";
import type { Vendor } from "@/lib/model";
import { assertVendorSlugFree } from "@/lib/server/slugs";
import { parseVendor } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const { resources } = await vendors().items
      .query<Vendor>("SELECT * FROM c ORDER BY c.name")
      .fetchAll();
    return json(200, { count: resources.length, vendors: resources });
  } catch (err) {
    return toResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const input = parseVendor(await request.json());
    await assertVendorSlugFree(input.slug!);
    const now = new Date().toISOString();

    const record: Vendor = {
      id: randomUUID(),
      slug: input.slug!,
      name: input.name!,
      iconUrl: input.iconUrl ?? null,
      ...(input.website ? { website: input.website } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await vendors().items.create(record);
    invalidate();
    return json(201, resource, { location: `/api/admin/vendors/${record.id}` });
  } catch (err) {
    return toResponse(err);
  }
}
