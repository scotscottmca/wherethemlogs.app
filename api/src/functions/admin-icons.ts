import { app, type HttpRequest, type HttpResponseInit } from "@azure/functions";
import { randomUUID } from "node:crypto";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { requireAdmin } from "../lib/auth";
import { badRequest, json, toResponse } from "../lib/errors";

/**
 * Icon upload. The blob container is public-read, so the URL this returns can
 * be written straight onto a vendor or app record and served to the browser.
 * Writes go through the Function App's managed identity — no storage key is
 * ever handed to a client.
 */

const MAX_BYTES = 512 * 1024;

const ALLOWED: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

let blobService: BlobServiceClient | undefined;

function getContainer() {
  const accountName = process.env.STORAGE_ACCOUNT_NAME;
  if (!accountName) throw new Error("STORAGE_ACCOUNT_NAME is not configured.");

  blobService ??= new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    new DefaultAzureCredential(),
  );
  return blobService.getContainerClient(process.env.ICONS_CONTAINER_NAME ?? "icons");
}

async function upload(request: HttpRequest): Promise<HttpResponseInit> {
  try {
    requireAdmin(request);

    const contentType = (request.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    const extension = ALLOWED[contentType];
    if (!extension) {
      throw badRequest(
        `Content-Type must be one of: ${Object.keys(ALLOWED).join(", ")}.`,
        { received: contentType || "(none)" },
      );
    }

    const body = Buffer.from(await request.arrayBuffer());
    if (!body.length) throw badRequest("The request body is empty.");
    if (body.length > MAX_BYTES) {
      throw badRequest(`Icons are limited to ${MAX_BYTES / 1024} KB.`, { received: body.length });
    }

    // An SVG is executable in a browsing context. Serving it from the same
    // origin as the site would be a stored-XSS vector, so it is served from
    // the storage account's own origin with a locked-down disposition.
    const cacheControl = "public, max-age=31536000, immutable";
    const blobName = `${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
    const blob = getContainer().getBlockBlobClient(blobName);

    await blob.uploadData(body, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: cacheControl,
        blobContentDisposition: "inline",
      },
    });

    return json(201, {
      url: blob.url,
      contentType,
      bytes: body.length,
    });
  } catch (err) {
    return toResponse(err);
  }
}

app.http("adminIcons", {
  route: "admin/icons",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: upload,
});
