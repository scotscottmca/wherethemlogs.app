import type { NextRequest } from "next/server";
import { issueFor } from "@/lib/requests";
import { ApiError, badRequest, json, toResponse } from "@/lib/server/errors";
import { createIssue, githubAppConfigured } from "@/lib/server/github-app";
import { parseRequest } from "@/lib/server/requests";
import { turnstileConfigured, verifyTurnstile } from "@/lib/server/turnstile";

export const dynamic = "force-dynamic";

/**
 * The on-site request forms post here; each accepted request becomes a public
 * GitHub issue filed by the site's App. Anonymous by design, so the gates are:
 * a honeypot field, Turnstile, the strict validation in parseRequest, and a
 * Cloudflare rate-limit rule on this path (docs/DEPLOYMENT.md).
 */
export async function POST(request: NextRequest) {
  try {
    if (!githubAppConfigured() || !turnstileConfigured()) {
      throw new ApiError(503, "requests_off", "Requests through the site are not switched on. Use GitHub instead.");
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw badRequest("A JSON object body is required.");

    // The honeypot: a field people never see. Anything in it is a bot.
    if (body.website) throw badRequest("The request could not be accepted.");

    // Validate before spending the Turnstile token: it is single use, so a typo
    // caught after it would cost the visitor a fresh check.
    const parsed = parseRequest(body);

    if (!(await verifyTurnstile(body.turnstile, request.headers.get("cf-connecting-ip")))) {
      throw badRequest("The human check did not pass. Try it again.");
    }

    const issue = await createIssue(issueFor(parsed));
    return json(201, { number: issue.number, url: issue.html_url });
  } catch (err) {
    if (err instanceof ApiError) return toResponse(err);
    console.error("request issue failed", err);
    return json(502, {
      error: "github_unavailable",
      message: "GitHub did not accept the request just now. Try again, or file it on GitHub directly.",
    });
  }
}
