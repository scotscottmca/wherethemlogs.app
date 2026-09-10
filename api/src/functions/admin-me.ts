import { app, type HttpRequest, type HttpResponseInit } from "@azure/functions";
import { ADMIN_ROLE, getPrincipal } from "../lib/auth";
import { json, toResponse } from "../lib/errors";

/**
 * Who the caller is, according to the Static Web App. The admin portal calls
 * this on load so it can show the signed-in identity and fail closed with a
 * useful message rather than a bare 403 on the first write.
 */
app.http("adminMe", {
  route: "admin/me",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      const principal = getPrincipal(request);
      if (!principal) {
        return json(200, { signedIn: false, isAdmin: false, roles: [] });
      }
      return json(200, {
        signedIn: true,
        isAdmin: principal.userRoles.includes(ADMIN_ROLE),
        userId: principal.userId,
        userDetails: principal.userDetails,
        identityProvider: principal.identityProvider,
        roles: principal.userRoles,
      });
    } catch (err) {
      return toResponse(err);
    }
  },
});
