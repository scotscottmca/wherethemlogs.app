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
export function middleware(request: NextRequest) {
  if (isAdmin(request)) return NextResponse.next();

  const signedIn = request.headers.get("x-ms-client-principal") !== null;

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      signedIn
        ? { error: "forbidden", message: "This action needs the admin role." }
        : { error: "unauthorized", message: "Sign in to continue." },
      { status: signedIn ? 403 : 401 },
    );
  }

  // Signed in but not an admin: say so, with the status that means it.
  if (signedIn) {
    return NextResponse.rewrite(new URL("/403", request.url), { status: 403 });
  }

  // Which provider to send people to. Container Apps exposes one path per
  // configured provider, so this follows the Bicep rather than being guessed.
  const provider = process.env.AUTH_PROVIDER === "aad" ? "aad" : "github";
  const login = new URL(`/.auth/login/${provider}`, request.url);
  login.searchParams.set("post_login_redirect_uri", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
