import { createSign } from "node:crypto";
import { GITHUB_ISSUES_REPO } from "../site";

/**
 * Files issues as the site's GitHub App, so they show as wherethemlogs[bot]
 * rather than as a person. The App holds Issues: write on this one
 * repository and nothing else.
 *
 * REQUESTS_APP_ID is the App's id. REQUESTS_APP_PRIVATE_KEY is its private
 * key, as the PEM or base64 of the PEM (a one-line secret survives every
 * hop from GitHub secret to container env).
 */

const API = "https://api.github.com";
const REPO = new URL(GITHUB_ISSUES_REPO).pathname.slice(1);

const HEADERS = {
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  "user-agent": "wherethemlogs.app",
};

export function githubAppConfigured(): boolean {
  return Boolean(process.env.REQUESTS_APP_ID && process.env.REQUESTS_APP_PRIVATE_KEY);
}

function privateKey(): string {
  const raw = process.env.REQUESTS_APP_PRIVATE_KEY ?? "";
  return raw.includes("BEGIN") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf8");
}

const b64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

/** The App's own token: ten minutes at most, backdated a minute for clock drift. */
function appJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iat: now - 60, exp: now + 540, iss: process.env.REQUESTS_APP_ID }),
  )}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey());
  return `${unsigned}.${b64url(signature)}`;
}

async function github<T>(path: string, init: RequestInit & { token: string }): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: { ...HEADERS, authorization: `Bearer ${token}`, ...(rest.body ? { "content-type": "application/json" } : {}) },
  });
  if (!res.ok) throw new Error(`GitHub ${init.method ?? "GET"} ${path} answered ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

let cached: { token: string; expires: number } | undefined;

/** An installation token lasts an hour; reuse it until five minutes before it lapses. */
async function installationToken(): Promise<string> {
  if (cached && cached.expires - Date.now() > 5 * 60_000) return cached.token;
  const jwt = appJwt();
  const installation = await github<{ id: number }>(`/repos/${REPO}/installation`, { token: jwt });
  const minted = await github<{ token: string; expires_at: string }>(
    `/app/installations/${installation.id}/access_tokens`,
    { method: "POST", token: jwt },
  );
  cached = { token: minted.token, expires: Date.parse(minted.expires_at) };
  return cached.token;
}

export async function createIssue(issue: { title: string; body: string; labels: string[] }) {
  const token = await installationToken();
  return github<{ number: number; html_url: string }>(`/repos/${REPO}/issues`, {
    method: "POST",
    token,
    body: JSON.stringify(issue),
  });
}
