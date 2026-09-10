import type { HttpRequest } from "@azure/functions";
import { forbidden, unauthorized } from "./errors";

/**
 * Static Web Apps authenticates the visitor and forwards the result as a
 * base64 JSON header. `staticwebapp.config.json` already refuses anonymous
 * traffic to /api/admin/*; this is the second lock, so a request that reaches
 * the Function App by another route still has to carry the role.
 */
export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

export const ADMIN_ROLE = "admin";

export function getPrincipal(request: HttpRequest): ClientPrincipal | null {
  const header = request.headers.get("x-ms-client-principal");
  if (!header) return null;

  try {
    const decoded = Buffer.from(header, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<ClientPrincipal>;
    if (!parsed.userId || !Array.isArray(parsed.userRoles)) return null;
    return {
      identityProvider: parsed.identityProvider ?? "unknown",
      userId: parsed.userId,
      userDetails: parsed.userDetails ?? "",
      userRoles: parsed.userRoles,
    };
  } catch {
    return null;
  }
}

/** Throws unless the caller holds the admin role. Returns who they are, for the audit fields. */
export function requireAdmin(request: HttpRequest): ClientPrincipal {
  // Local development only, and only when explicitly switched on. The setting
  // does not exist in any deployed configuration.
  if (process.env.LOCAL_ADMIN_BYPASS === "true") {
    return {
      identityProvider: "local",
      userId: "local-dev",
      userDetails: "local development",
      userRoles: ["authenticated", ADMIN_ROLE],
    };
  }

  const principal = getPrincipal(request);
  if (!principal) throw unauthorized();
  if (!principal.userRoles.includes(ADMIN_ROLE)) throw forbidden();
  return principal;
}
