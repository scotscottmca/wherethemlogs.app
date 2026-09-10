import { app, type HttpRequest, type HttpResponseInit } from "@azure/functions";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../lib/auth";
import { invalidate } from "../lib/catalog";
import { apps as appsContainer, vendors } from "../lib/cosmos";
import { badRequest, json, notFound, toResponse } from "../lib/errors";
import type { App, Vendor } from "../lib/model";
import { parseApp } from "../lib/validate";

function ifMatch(request: HttpRequest): string | undefined {
  const value = request.headers.get("if-match");
  return value && value !== "*" ? value : undefined;
}

/**
 * vendorId is the partition key, so every read and write of an app needs it.
 * The caller may pass it as a query parameter; otherwise it costs one
 * cross-partition lookup to find.
 */
async function partitionFor(id: string, request: HttpRequest): Promise<string> {
  const hint = request.query.get("vendorId");
  if (hint) return hint;

  const { resources } = await appsContainer().items
    .query<{ vendorId: string }>({
      query: "SELECT c.vendorId FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }],
    })
    .fetchAll();

  const found = resources[0];
  if (!found) throw notFound(`App "${id}"`);
  return found.vendorId;
}

async function list(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const vendorId = request.query.get("vendorId");

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

async function getOne(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const id = request.params.id!;
    const vendorId = await partitionFor(id, request);
    const { resource } = await appsContainer().item(id, vendorId).read<App>();
    if (!resource) throw notFound(`App "${id}"`);
    return json(200, resource, { etag: resource._etag ?? "" });
  } catch (err) {
    return toResponse(err);
  }
}

async function create(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const input = parseApp(await request.json());

    const { resource: vendor } = await vendors().item(input.vendorId!, input.vendorId!).read<Vendor>();
    if (!vendor) throw badRequest(`Vendor "${input.vendorId}" does not exist.`);

    const now = new Date().toISOString();
    const record: App = {
      id: randomUUID(),
      vendorId: input.vendorId!,
      slug: input.slug!,
      name: input.name!,
      aliases: input.aliases ?? [],
      iconUrl: input.iconUrl ?? null,
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

async function update(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const id = request.params.id!;
    const patch = parseApp(await request.json(), { partial: true });
    const vendorId = await partitionFor(id, request);

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

async function remove(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const id = request.params.id!;
    const vendorId = await partitionFor(id, request);

    // Log paths are embedded, so they go with the app. No orphans are possible.
    await appsContainer().item(id, vendorId).delete();
    invalidate();
    return json(200, { deleted: { app: id } });
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

app.http("adminApps", {
  route: "admin/apps",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: router,
});

app.http("adminAppById", {
  route: "admin/apps/{id}",
  methods: ["GET", "PATCH", "PUT", "DELETE"],
  authLevel: "anonymous",
  handler: router,
});
