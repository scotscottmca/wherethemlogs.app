import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/server/auth";

/**
 * Gates the admin surface at the edge of the app.
 *
 * Container Apps' built-in auth runs in front of the container and injects the
 * signed-in principal; this decides what to do with it. Route handlers under
 * /api/admin re-check with `requireAdmin()` - this is the friendly redirect,
 * that is the lock.
 */
export function proxy(request: NextRequest) {
  if (isAdmin(request)) return NextResponse.next();

  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const signedIn = request.headers.get("x-ms-client-principal") !== null;

  // Which provider to send people to. Container Apps exposes one path per
  // configured provider, so this follows the infrastructure rather than being
  // guessed, and "none" is a real state that has to be answered before
  // anything else: sending someone to a login endpoint that was never deployed
  // produces a 404 nobody can diagnose.
  const provider = process.env.AUTH_PROVIDER ?? "none";

  if (provider === "none") {
    const message =
      "Admin sign-in is not configured on this deployment. Set authProvider and authClientId in the infrastructure parameters, and redeploy.";
    return isApi
      ? NextResponse.json({ error: "auth_not_configured", message }, { status: 503 })
      : NextResponse.rewrite(new URL("/403?reason=unconfigured", request.url), { status: 503 });
  }

  if (isApi) {
    return NextResponse.json(
      signedIn
        ? { error: "forbidden", message: "This account is not an administrator." }
        : { error: "unauthorized", message: "Sign in to continue." },
      { status: signedIn ? 403 : 401 },
    );
  }

  // Signed in but not an admin: say so, with the status that means it.
  if (signedIn) {
    return NextResponse.rewrite(new URL("/403", request.url), { status: 403 });
  }

  const login = new URL(`/.auth/login/${provider}`, request.url);
  login.searchParams.set("post_login_redirect_uri", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
