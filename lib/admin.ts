/**
 * The browser's half of the admin portal.
 *
 * Every write goes over `/api/admin/…`; nothing here runs on the server. The
 * record shapes come from `lib/model.ts`, the same file the route handlers
 * validate against, so a field renamed on one side fails to compile on the
 * other.
 */
import type { App, LogPath, Platform, Vendor } from "./model";

export type { App, LogPath, Vendor };

/** One app, flattened for the stock filter. Read on the server, filtered in the browser. */
export interface StockRow {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  slug: string;
  aliases: string[];
  platforms: Platform[];
  logPathCount: number;
}

/** Every admin failure arrives in this shape. `details` names what was wrong. */
export class AdminError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AdminError";
  }

  /**
   * The field the server's message names, so a rejection can print against the
   * row it belongs to instead of at the top of the form. The validators quote
   * the field first ('"slug" must be lowercase…'); the handful of messages that
   * do not are matched by their opening words.
   */
  get field(): string | null {
    const quoted = /^"([A-Za-z]+)(?:\[\d+\])?"/.exec(this.message);
    if (quoted) return quoted[1]!;
    if (this.message.startsWith("Unknown type")) return "types";
    if (this.message.startsWith("The slug ")) return "slug";
    if (this.message.startsWith("Vendor ")) return "vendorId";
    if (this.message.startsWith("That platform already carries")) return "path";
    if (this.message.startsWith("Content-Type must be")) return "iconUrl";
    return null;
  }

  /** A 412: the record moved under us and the write was refused, not applied. */
  get superseded(): boolean {
    return this.status === 412;
  }

  /** The apps blocking a vendor delete, when that is what failed. */
  get blocking(): { id: string; name: string }[] | null {
    const apps = (this.details as { apps?: { id: string; name: string }[] } | undefined)?.apps;
    return this.status === 409 && Array.isArray(apps) ? apps : null;
  }
}

async function fail(response: Response): Promise<never> {
  let body: { error?: string; message?: string; details?: unknown } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // A proxy or the platform's own auth layer answered instead of the app.
  }

  const fallback =
    response.status === 401
      ? "Your session has expired. Reload the page to sign in again."
      : response.status === 403
        ? "This account no longer carries the admin role. Nothing was written."
        : response.status >= 500
          ? "The store is not answering. Nothing was written — try again in a moment."
          : `The request was refused (${response.status}).`;

  throw new AdminError(
    response.status,
    body.error ?? "error",
    body.message ?? fallback,
    body.details,
  );
}

interface Options {
  /** The `_etag` this edit was started from. Omit and last write wins. */
  etag?: string;
  body?: unknown;
}

async function call<T>(method: string, url: string, { etag, body }: Options = {}): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(etag ? { "if-match": etag } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) return fail(response);
  return (await response.json()) as T;
}

/* --- Reads ---------------------------------------------------------------- */

/**
 * Re-reads one record and returns it with the tag it currently carries. This is
 * what the 412 recovery calls: it needs the live version to compare against,
 * and the fresh tag to write with.
 */
export async function reread<T>(url: string): Promise<{ record: T; etag: string | undefined }> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) return fail(response);
  return {
    record: (await response.json()) as T,
    etag: response.headers.get("etag") ?? undefined,
  };
}

/* --- Vendors -------------------------------------------------------------- */

export const createVendor = (body: Partial<Vendor>) =>
  call<Vendor>("POST", "/api/admin/vendors", { body });

export const patchVendor = (id: string, body: Partial<Vendor>, etag?: string) =>
  call<Vendor>("PATCH", `/api/admin/vendors/${id}`, { body, etag });

export const deleteVendor = (id: string, cascade = false) =>
  call<{ deleted: { vendor: string; apps: string[] } }>(
    "DELETE",
    `/api/admin/vendors/${id}${cascade ? "?cascade=true" : ""}`,
  );

/* --- Apps ----------------------------------------------------------------- */

export const createApp = (body: Partial<App>) => call<App>("POST", "/api/admin/apps", { body });

export const patchApp = (id: string, vendorId: string, body: Partial<App>, etag?: string) =>
  call<App>("PATCH", `/api/admin/apps/${id}?vendorId=${encodeURIComponent(vendorId)}`, {
    body,
    etag,
  });

export const deleteApp = (id: string, vendorId: string) =>
  call<{ deleted: { app: string } }>(
    "DELETE",
    `/api/admin/apps/${id}?vendorId=${encodeURIComponent(vendorId)}`,
  );

/* --- Log paths ------------------------------------------------------------ */

/** Create and update hand the whole app back, so the portal can hold its new tag. */
export interface LogPathWrite {
  app: App;
  logPath: LogPath;
}

const logPathUrl = (appId: string, vendorId: string, logPathId?: string) =>
  `/api/admin/apps/${appId}/logpaths${logPathId ? `/${logPathId}` : ""}?vendorId=${encodeURIComponent(vendorId)}`;

export const createLogPath = (
  appId: string,
  vendorId: string,
  body: Partial<LogPath>,
  etag?: string,
) => call<LogPathWrite>("POST", logPathUrl(appId, vendorId), { body, etag });

export const patchLogPath = (
  appId: string,
  vendorId: string,
  logPathId: string,
  body: Partial<LogPath>,
  etag?: string,
) => call<LogPathWrite>("PATCH", logPathUrl(appId, vendorId, logPathId), { body, etag });

export const deleteLogPath = (
  appId: string,
  vendorId: string,
  logPathId: string,
  etag?: string,
) =>
  call<{ app: App; deleted: { logPath: string } }>(
    "DELETE",
    logPathUrl(appId, vendorId, logPathId),
    { etag },
  );

/* --- Icons ---------------------------------------------------------------- */

export const ICON_TYPES = ["image/svg+xml", "image/png", "image/webp", "image/jpeg"];
export const ICON_MAX_BYTES = 512 * 1024;

/** Raw bytes, typed by the file itself. The response's `url` is what gets stored. */
export async function uploadIcon(file: File): Promise<{ url: string; bytes: number }> {
  if (!ICON_TYPES.includes(file.type)) {
    throw new AdminError(
      400,
      "bad_request",
      `"iconUrl" — an icon must be SVG, PNG, WebP or JPEG. That file is ${file.type || "of no declared type"}.`,
    );
  }
  if (file.size > ICON_MAX_BYTES) {
    throw new AdminError(
      400,
      "bad_request",
      `"iconUrl" — icons are limited to 512 KB. That file is ${Math.ceil(file.size / 1024)} KB.`,
    );
  }

  const response = await fetch("/api/admin/icons", {
    method: "POST",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!response.ok) return fail(response);
  return (await response.json()) as { url: string; bytes: number };
}
