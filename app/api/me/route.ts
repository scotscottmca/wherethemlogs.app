import { ADMIN_ROLE, getPrincipal } from "@/lib/server/auth";
import { json, toResponse } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

/**
 * Who the caller is.
 *
 * Deliberately NOT under /api/admin: an endpoint whose job is to answer "are
 * you an admin?" cannot be gated on being one, or a signed-in non-admin gets a
 * 403 instead of an answer. The portal calls this on load so it can fail closed
 * with a useful message rather than a bare 403 on the first write.
 */
export async function GET(request: Request) {
  try {
    const principal = getPrincipal(request);
    if (!principal) return json(200, { signedIn: false, isAdmin: false, roles: [] });

    return json(200, {
      signedIn: true,
      isAdmin: principal.roles.includes(ADMIN_ROLE),
      userId: principal.userId,
      userDetails: principal.userDetails,
      identityProvider: principal.identityProvider,
      roles: principal.roles,
    });
  } catch (err) {
    return toResponse(err);
  }
}
