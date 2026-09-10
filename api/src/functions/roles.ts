import { app, type HttpRequest, type HttpResponseInit } from "@azure/functions";
import { json } from "../lib/errors";

/**
 * Optional role source for Static Web Apps.
 *
 * Not wired up by default: roles are assigned through SWA's own invitations,
 * which needs no code. Switch to this when admin access should follow an Entra
 * ID group instead of a per-person invite — add to staticwebapp.config.json:
 *
 *     "auth": { "rolesSource": "/api/roles", ... }
 *
 * SWA POSTs the signed-in user's claims here and expects `{ "roles": [...] }`
 * back. Set ADMIN_GROUP_IDS (comma-separated Entra group object ids) on the
 * Function App, and add a groups claim to the app registration's token.
 */

interface RolesRequest {
  identityProvider?: string;
  userId?: string;
  userDetails?: string;
  claims?: { typ: string; val: string }[];
  accessToken?: string;
}

const GROUP_CLAIM_TYPES = new Set([
  "groups",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups",
]);

app.http("roles", {
  route: "roles",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const allowed = (process.env.ADMIN_GROUP_IDS ?? "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

    if (!allowed.length) return json(200, { roles: [] });

    let body: RolesRequest;
    try {
      body = (await request.json()) as RolesRequest;
    } catch {
      return json(200, { roles: [] });
    }

    const groups = (body.claims ?? [])
      .filter((c) => GROUP_CLAIM_TYPES.has(c.typ))
      .map((c) => c.val);

    const isAdmin = groups.some((g) => allowed.includes(g));
    return json(200, { roles: isAdmin ? ["admin"] : [] });
  },
});
