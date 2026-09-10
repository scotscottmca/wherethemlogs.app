import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness only: is this process answering?
 *
 * Deliberately does not touch Cosmos. The probes must not restart or
 * de-rotate a healthy container because the database is having a bad minute -
 * the pages already render a "not answering" state, and taking the last
 * replica out of rotation turns a degraded site into a down one.
 * `/api/health` is the one that checks the store.
 */
export function GET() {
  return NextResponse.json({ status: "live" });
}
