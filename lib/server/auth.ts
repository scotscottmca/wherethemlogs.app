import { forbidden, unauthorized } from "./errors";

/**
 * Container Apps' built-in authentication signs the visitor in with Entra ID
 * and forwards the result to the container as a base64 JSON header. The
 * platform strips any client-supplied copy of this header, so what arrives is
 * what the platform wrote.
 *
 * Admin membership is an Entra ID **app role**: assign users or groups to the
 * `admin` app role on the app registration and it lands in the token's `roles`
 * claim. There is no invitation list to keep in sync.
 */

export const ADMIN_ROLE = "admin";

interface RawPrincipal {
  auth_typ?: string;
  name_typ?: string;
  role_typ?: string;
  claims?: { typ: string; val: string }[];
}

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  roles: string[];
}

const NAME_CLAIMS = new Set([
  "preferred_username",
  "name",
  "emails",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
]);

const ID_CLAIMS = new Set([
  "oid",
  "sub",
  "http://schemas.microsoft.com/identity/claims/objectidentifier",
]);

const ROLE_CLAIMS = new Set([
  "roles",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
]);

export function getPrincipal(request: Request): ClientPrincipal | null {
  const header = request.headers.get("x-ms-client-principal");
  if (!header) return null;

  try {
    const parsed = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as RawPrincipal;
    const claims = parsed.claims ?? [];

    const pick = (set: Set<string>) => claims.find((c) => set.has(c.typ))?.val;
    const userId = pick(ID_CLAIMS);
    if (!userId) return null;

    return {
      identityProvider: parsed.auth_typ ?? "aad",
      userId,
      userDetails: pick(NAME_CLAIMS) ?? "",
      roles: claims.filter((c) => ROLE_CLAIMS.has(c.typ)).map((c) => c.val),
    };
  } catch {
    return null;
  }
}

export function isAdmin(request: Request): boolean {
  return getPrincipal(request)?.roles.includes(ADMIN_ROLE) ?? false;
}

/** Throws unless the caller holds the admin role. Returns who they are. */
export function requireAdmin(request: Request): ClientPrincipal {
  // Local development only, and only when explicitly switched on. No deployed
  // configuration sets it — the Bicep never emits it.
  if (process.env.LOCAL_ADMIN_BYPASS === "true") {
    return {
      identityProvider: "local",
      userId: "local-dev",
      userDetails: "local development",
      roles: [ADMIN_ROLE],
    };
  }

  const principal = getPrincipal(request);
  if (!principal) throw unauthorized();
  if (!principal.roles.includes(ADMIN_ROLE)) throw forbidden();
  return principal;
}
