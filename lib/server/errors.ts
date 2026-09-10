import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "bad_request", message, details);
export const unauthorized = (message = "Sign in to continue.") =>
  new ApiError(401, "unauthorized", message);
export const forbidden = (message = "This action needs the admin role.") =>
  new ApiError(403, "forbidden", message);
export const notFound = (what: string) =>
  new ApiError(404, "not_found", `${what} does not exist.`);
export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, "conflict", message, details);

export function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers });
}

/** Every route handler's failure leaves through here, so no stack trace escapes. */
export function toResponse(err: unknown) {
  if (err instanceof ApiError) {
    return json(err.status, { error: err.code, message: err.message, details: err.details });
  }

  const cosmosCode = (err as { code?: number } | undefined)?.code;
  if (cosmosCode === 404) return json(404, { error: "not_found", message: "Not found." });
  if (cosmosCode === 409) {
    return json(409, {
      error: "conflict",
      message: "Something with that id or slug already exists.",
    });
  }
  if (cosmosCode === 412) {
    return json(412, {
      error: "precondition_failed",
      message: "The record changed since you loaded it. Reload and reapply your edit.",
    });
  }

  console.error("Unhandled error in a route handler", err);
  return json(500, { error: "internal_error", message: "The request could not be completed." });
}
