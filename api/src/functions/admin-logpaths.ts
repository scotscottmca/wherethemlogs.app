import { app, type HttpRequest, type HttpResponseInit } from "@azure/functions";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "../lib/auth";
import { invalidate } from "../lib/catalog";
import { apps as appsContainer } from "../lib/cosmos";
import { badRequest, json, notFound, toResponse } from "../lib/errors";
import type { App, LogPath } from "../lib/model";
import { parseLogPath } from "../lib/validate";

/**
 * Log paths are embedded on the app document, so every operation here is a
 * read-modify-write of one app, guarded by its etag. That is deliberate: a
 * path is never meaningful without the app it belongs to.
 */

function ifMatch(request: HttpRequest): string | undefined {
  const value = request.headers.get("if-match");
  return value && value !== "*" ? value : undefined;
}

async function loadApp(request: HttpRequest): Promise<{ app: App; vendorId: string }> {
  const appId = request.params.appId!;
  const hint = request.query.get("vendorId");

  let vendorId = hint ?? "";
  if (!vendorId) {
    const { resources } = await appsContainer().items
      .query<{ vendorId: string }>({
        query: "SELECT c.vendorId FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: appId }],
      })
      .fetchAll();
    const found = resources[0];
    if (!found) throw notFound(`App "${appId}"`);
    vendorId = found.vendorId;
  }

  const { resource } = await appsContainer().item(appId, vendorId).read<App>();
  if (!resource) throw notFound(`App "${appId}"`);
  return { app: resource, vendorId };
}

async function save(current: App, vendorId: string, logPaths: LogPath[], etag?: string) {
  const next: App = { ...current, logPaths, updatedAt: new Date().toISOString() };
  const { resource } = await appsContainer()
    .item(current.id, vendorId)
    .replace(next, { accessCondition: { type: "IfMatch", condition: etag ?? current._etag! } });
  invalidate();
  return resource;
}

async function list(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const { app: current } = await loadApp(request);
    return json(200, { count: current.logPaths.length, logPaths: current.logPaths });
  } catch (err) {
    return toResponse(err);
  }
}

async function create(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const input = parseLogPath(await request.json());
    const { app: current, vendorId } = await loadApp(request);

    const record: LogPath = {
      id: randomUUID(),
      platform: input.platform!,
      label: input.label!,
      path: input.path!,
      types: input.types ?? [],
      scope: input.scope!,
      ...(input.note ? { note: input.note } : {}),
      ...(input.variant ? { variant: input.variant } : {}),
    };

    // The same path twice on one platform is a duplicate, not a variant.
    const clash = current.logPaths.find(
      (p) => p.platform === record.platform && p.path === record.path && p.variant === record.variant,
    );
    if (clash) {
      throw badRequest("That platform already carries this exact path. Edit the existing one, or set a variant.");
    }

    const saved = await save(current, vendorId, [...current.logPaths, record], ifMatch(request));
    return json(201, { app: saved, logPath: record });
  } catch (err) {
    return toResponse(err);
  }
}

async function update(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const logPathId = request.params.logPathId!;
    const patch = parseLogPath(await request.json(), { partial: true });
    const { app: current, vendorId } = await loadApp(request);

    const index = current.logPaths.findIndex((p) => p.id === logPathId);
    if (index === -1) throw notFound(`Log path "${logPathId}"`);

    const merged: LogPath = { ...current.logPaths[index]!, ...patch, id: logPathId };
    const next = [...current.logPaths];
    next[index] = merged;

    const saved = await save(current, vendorId, next, ifMatch(request));
    return json(200, { app: saved, logPath: merged });
  } catch (err) {
    return toResponse(err);
  }
}

async function remove(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);
    const logPathId = request.params.logPathId!;
    const { app: current, vendorId } = await loadApp(request);

    const next = current.logPaths.filter((p) => p.id !== logPathId);
    if (next.length === current.logPaths.length) throw notFound(`Log path "${logPathId}"`);

    const saved = await save(current, vendorId, next, ifMatch(request));
    return json(200, { app: saved, deleted: { logPath: logPathId } });
  } catch (err) {
    return toResponse(err);
  }
}

async function collection(request: HttpRequest): Promise<HttpResponseInit> {
  return request.method === "POST" ? create(request) : list(request);
}

async function item(request: HttpRequest): Promise<HttpResponseInit> {
  return request.method === "DELETE" ? remove(request) : update(request);
}

app.http("adminLogPaths", {
  route: "admin/apps/{appId}/logpaths",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: collection,
});

app.http("adminLogPathById", {
  route: "admin/apps/{appId}/logpaths/{logPathId}",
  methods: ["PATCH", "PUT", "DELETE"],
  authLevel: "anonymous",
  handler: item,
});
