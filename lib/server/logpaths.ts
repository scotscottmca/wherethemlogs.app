import { apps } from "./cosmos";
import { invalidate } from "./catalog";
import { notFound } from "./errors";
import type { App, LogPath } from "../model";
import { partitionFor } from "./partition";

/**
 * Log paths are embedded on the app document, so every operation is a
 * read-modify-write of one app, guarded by its etag. That is deliberate: a path
 * is never meaningful without the app it belongs to.
 */
export async function loadApp(appId: string, hint: string | null): Promise<{ app: App; vendorId: string }> {
  const vendorId = await partitionFor(appId, hint);
  const { resource } = await apps().item(appId, vendorId).read<App>();
  if (!resource) throw notFound(`App "${appId}"`);
  return { app: resource, vendorId };
}

export async function saveLogPaths(
  current: App,
  vendorId: string,
  logPaths: LogPath[],
  etag?: string,
): Promise<App | undefined> {
  const next: App = { ...current, logPaths, updatedAt: new Date().toISOString() };
  const { resource } = await apps()
    .item(current.id, vendorId)
    .replace(next, { accessCondition: { type: "IfMatch", condition: etag ?? current._etag! } });
  invalidate();
  return resource;
}
