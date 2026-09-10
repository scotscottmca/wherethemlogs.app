import { app, type HttpRequest, type HttpResponseInit } from "@azure/functions";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../lib/auth";
import { invalidate } from "../lib/catalog";
import { apps as appsContainer, vendors } from "../lib/cosmos";
import { badRequest, conflict, json, notFound, toResponse } from "../lib/errors";
import type { App, Vendor } from "../lib/model";
import { parseVendor } from "../lib/validate";

/** Cosmos rejects a write whose etag has moved on, so two editors cannot clobber each other. */
function ifMatch(request: HttpRequest): string | undefined {
  const value = request.headers.get("if-match");
  return value && value !== "*" ? value : undefined;
}

async function list(request: HttpRequest): Promise<HttpResponseInit> {
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

async function getOne(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const id = request.params.id!;
    const { resource } = await vendors().item(id, id).read<Vendor>();
    if (!resource) throw notFound(`Vendor "${id}"`);
    return json(200, resource, { etag: resource._etag ?? "" });
  } catch (err) {
    return toResponse(err);
  }
}

async function create(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const input = parseVendor(await request.json());
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

async function update(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const id = request.params.id!;
    const patch = parseVendor(await request.json(), { partial: true });

    const { resource: current } = await vendors().item(id, id).read<Vendor>();
    if (!current) throw notFound(`Vendor "${id}"`);

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
 * A vendor with apps is refused rather than silently orphaning them. `?cascade=true`
 * is the deliberate second press: it deletes the vendor's apps and their log paths too.
 */
async function remove(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const id = request.params.id!;
    const cascade = request.query.get("cascade") === "true";

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

async function router(request: HttpRequest): Promise<HttpResponseInit> {
  switch (request.method) {
    case "GET":
      return request.params.id ? getOne(request) : list(request);
    case "POST":
      return create(request);
    case "PATCH":
    case "PUT":
      return update(request);
    case "DELETE":
      return remove(request);
    default:
      return toResponse(badRequest(`${request.method} is not supported here.`));
  }
}

app.http("adminVendors", {
  route: "admin/vendors",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: router,
});

app.http("adminVendorById", {
  route: "admin/vendors/{id}",
  methods: ["GET", "PATCH", "PUT", "DELETE"],
  authLevel: "anonymous",
  handler: router,
});
