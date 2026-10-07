import { badRequest } from "./errors";
import {
  ARCHITECTURES,
  CORRECTION_KINDS,
  LIMITS,
  PLATFORM_FIELDS,
  PLATFORM_NAMES,
  SCOPES,
  type Credit,
  type SiteRequest,
} from "../requests";

/**
 * Validates a request from the on-site form. Everything here ends up in a
 * public issue filed under the site's name, so the rules are strict: known
 * values for every choice, a length cap on every field, and credit fields that
 * only accept the shape they claim to be.
 */

type Row = Record<string, unknown>;

function text(value: unknown, field: string, max: number, required = false): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) throw badRequest(`"${field}" is required.`);
    return undefined;
  }
  if (typeof value !== "string") throw badRequest(`"${field}" must be text.`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw badRequest(`"${field}" is required.`);
    return undefined;
  }
  if (trimmed.length > max) throw badRequest(`"${field}" is longer than ${max} characters.`);
  // A run of three backticks would close the fence the answer is printed in.
  if (trimmed.includes("```")) throw badRequest(`"${field}" cannot contain three backticks in a row.`);
  return trimmed;
}

/** A one-line answer: newlines would break the issue title and the heading layout. */
function line(value: unknown, field: string, max: number, required = false): string | undefined {
  const out = text(value, field, max, required);
  if (out && /[\r\n]/.test(out)) throw badRequest(`"${field}" must be a single line.`);
  return out;
}

function choice<T extends string>(value: unknown, field: string, options: readonly T[]): T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw badRequest(`"${field}" must be one of: ${options.join(", ")}.`);
  }
  return value as T;
}

function choices(value: unknown, field: string, options: readonly string[]): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw badRequest(`"${field}" must be a list.`);
  for (const v of value) choice(v, field, options);
  return [...new Set(value as string[])];
}

function credit(value: unknown): Credit {
  const c = (value ?? {}) as Row;
  const github = line(c.github, "github", LIMITS.github);
  // GitHub's own rule: letters, digits and single hyphens, not at either end.
  if (github && !/^[A-Za-z0-9](?:-?[A-Za-z0-9])*$/.test(github.replace(/^@/, ""))) {
    throw badRequest('"github" must be a GitHub username.');
  }
  const linkedin = line(c.linkedin, "linkedin", LIMITS.linkedin);
  if (linkedin && !/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+\/?$/.test(linkedin)) {
    throw badRequest('"linkedin" must be a LinkedIn profile URL, like https://www.linkedin.com/in/your-name.');
  }
  const social = line(c.social, "social", LIMITS.social);
  if (social && !/^@?[A-Za-z0-9._-]+$/.test(social)) {
    throw badRequest('"social" must be an X or Bluesky handle, like @name or name.bsky.social.');
  }
  return {
    ...(github ? { github: github.replace(/^@/, "") } : {}),
    ...(linkedin ? { linkedin } : {}),
    ...(social ? { social } : {}),
  };
}

export function parseRequest(body: unknown): SiteRequest {
  if (typeof body !== "object" || body === null) throw badRequest("A JSON object body is required.");
  const b = body as Row;

  if (b.kind === "correction") {
    return {
      kind: "correction",
      app: line(b.app, "app", LIMITS.name, true)!,
      platform: choice(b.platform, "platform", PLATFORM_NAMES),
      listed: text(b.listed, "listed", LIMITS.paths, true)!,
      problem: choice(b.problem, "problem", CORRECTION_KINDS),
      correct: text(b.correct, "correct", LIMITS.paths, true)!,
      verification: text(b.verification, "verification", LIMITS.prose, true)!,
      credit: credit(b.credit),
    };
  }

  if (b.kind !== "add") throw badRequest('"kind" must be "add" or "correction".');

  const pathsIn = (b.paths ?? {}) as Row;
  const installersIn = (b.installers ?? {}) as Row;
  const paths: Record<string, string> = {};
  const installers: Record<string, string[]> = {};
  for (const p of PLATFORM_FIELDS) {
    const value = text(pathsIn[p.id], `paths.${p.id}`, LIMITS.paths);
    if (value) paths[p.id] = value;
    installers[p.id] = choices(installersIn[p.id], `installers.${p.id}`, p.installers);
  }
  if (!Object.keys(paths).length) throw badRequest('"paths" needs at least one log path.');

  const scope = b.scope === undefined || b.scope === "" ? undefined : choice(b.scope, "scope", SCOPES);

  return {
    kind: "add",
    app: line(b.app, "app", LIMITS.name, true)!,
    vendor: line(b.vendor, "vendor", LIMITS.name, true)!,
    aliases: line(b.aliases, "aliases", LIMITS.aliases),
    variant: line(b.variant, "variant", LIMITS.variant),
    version: line(b.version, "version", LIMITS.version),
    paths,
    installers,
    architectures: choices(b.architectures, "architectures", ARCHITECTURES),
    scope,
    verification: text(b.verification, "verification", LIMITS.prose, true)!,
    notes: text(b.notes, "notes", LIMITS.prose),
    credit: credit(b.credit),
  };
}
