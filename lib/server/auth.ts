import { forbidden, unauthorized } from "./errors";

/**
 * Container Apps' built-in authentication signs the visitor in and forwards the
 * result to the container as a base64 JSON header. The platform strips any
 * client-supplied copy of that header, so what arrives is what the platform
 * wrote.
 *
 * Two providers are supported, and admin is decided differently for each:
 *
 * - **GitHub** authenticates, but carries no notion of roles, so anyone with a
 *   GitHub account can sign in. Authorization is an allowlist:
 *   ADMIN_GITHUB_LOGINS, comma separated, matching either the login or the
 *   numeric user id. Empty means nobody is an admin.
 * - **Entra ID** carries an `admin` app role in the token's `roles` claim, so
 *   the directory is the allowlist and nothing local needs maintaining.
 *
 * Whichever is configured, an empty allowlist and an absent role both fail
 * closed. Sign-in is never sufficient on its own.
 */

export const ADMIN_ROLE = "admin";

/**
 * Local development only, and only when explicitly switched on. No deployed
 * configuration sets it: the Bicep never emits it, and the container image
 * carries no default for it.
 *
 * Both the middleware and the route handlers consult this. They have to agree,
 * or /admin is unreachable locally while the API behind it is wide open, which
 * is the worst of both.
 */
function localBypass(): boolean {
  return process.env.LOCAL_ADMIN_BYPASS === "true";
}

const LOCAL_PRINCIPAL: ClientPrincipal = {
  identityProvider: "local",
  userId: "local-dev",
  userDetails: "local development",
  roles: [ADMIN_ROLE],
  claims: [],
};

function allowlist(): string[] {
  return (process.env.ADMIN_GITHUB_LOGINS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** True when any identifying claim, or the userId itself, is on the allowlist. */
function onAllowlist(principal: ClientPrincipal): boolean {
  const allowed = allowlist();
  if (!allowed.length) return false;

  const candidates = [
    principal.userId,
    principal.userDetails,
    ...principal.claims.filter((c) => LOGIN_CLAIMS.has(c.typ)).map((c) => c.val),
  ]
    .filter(Boolean)
    .map((v) => v.toLowerCase());

  return candidates.some((c) => allowed.includes(c));
}

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
  /**
   * Every claim the platform sent. Surfaced through /api/me so the allowlist
   * can be built from what actually arrives rather than from a guess about
   * which claim type a provider uses.
   */
  claims: { typ: string; val: string }[];
}

/**
 * Claim types carrying a GitHub login vary by how the platform maps them, so
 * match a set rather than betting on one. /api/me prints what actually arrived.
 */
const LOGIN_CLAIMS = new Set([
  "urn:github:login",
  "preferred_username",
  "name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
]);

const NAME_CLAIMS = new Set([
  "preferred_username",
  "name",
  "emails",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
]);

const ID_CLAIMS = new Set([
  // Entra
  "oid",
  "sub",
  "http://schemas.microsoft.com/identity/claims/objectidentifier",
  // GitHub, and anything else the platform maps to the standard SOAP claims
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
  "urn:github:id",
]);

const ROLE_CLAIMS = new Set([
  "roles",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
]);

export function getPrincipal(request: Request): ClientPrincipal | null {
  // The platform only strips a client-sent principal header when its auth is
  // switched on. With no provider deployed, the header is whatever the caller
  // typed, so it is never trusted.
  if ((process.env.AUTH_PROVIDER ?? "none") === "none") return null;
  const header = request.headers.get("x-ms-client-principal");
  if (!header) return null;

  try {
    const parsed = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as RawPrincipal;
    const claims = parsed.claims ?? [];

    const pick = (set: Set<string>) => claims.find((c) => set.has(c.typ))?.val;

    // Never bail because no known id claim matched. A principal whose claim
    // types we do not recognise is still a signed-in visitor, and returning
    // null here would hide the very claims /api/me exists to show - which is
    // how a provider swap turns into an unexplainable 403.
    const userId = pick(ID_CLAIMS) ?? pick(LOGIN_CLAIMS) ?? "";
    if (!claims.length) return null;

    return {
      identityProvider: parsed.auth_typ ?? "unknown",
      userId,
      userDetails: pick(NAME_CLAIMS) ?? "",
      roles: claims.filter((c) => ROLE_CLAIMS.has(c.typ)).map((c) => c.val),
      claims,
    };
  } catch {
    return null;
  }
}

export function isAdmin(request: Request): boolean {
  if (localBypass()) return true;

  const principal = getPrincipal(request);
  if (!principal) return false;

  // Entra's app role, or GitHub's allowlist. Either is sufficient; neither
  // being present is a refusal.
  return principal.roles.includes(ADMIN_ROLE) || onAllowlist(principal);
}

/** Throws unless the caller holds the admin role. Returns who they are. */
export function requireAdmin(request: Request): ClientPrincipal {
  if (localBypass()) return LOCAL_PRINCIPAL;

  const principal = getPrincipal(request);
  if (!principal) throw unauthorized();
  if (!principal.roles.includes(ADMIN_ROLE) && !onAllowlist(principal)) throw forbidden();
  return principal;
}
