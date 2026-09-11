import { badRequest } from "./errors";
import {
  ALL_TYPES, PLATFORMS, SCOPES, pathLines, slugify,
  type LogPath, type Platform, type Scope,
} from "../model";

const TYPE_SET = new Set<string>(ALL_TYPES);

function str(value: unknown, field: string, { max = 300, required = true } = {}): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) throw badRequest(`"${field}" is required.`);
    return undefined;
  }
  if (typeof value !== "string") throw badRequest(`"${field}" must be a string.`);
  const trimmed = value.trim();
  if (required && !trimmed) throw badRequest(`"${field}" cannot be blank.`);
  if (trimmed.length > max) throw badRequest(`"${field}" is longer than ${max} characters.`);
  return trimmed;
}

function strArray(value: unknown, field: string, max = 40): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw badRequest(`"${field}" must be an array of strings.`);
  if (value.length > max) throw badRequest(`"${field}" holds more than ${max} entries.`);
  return value.map((v, i) => {
    if (typeof v !== "string" || !v.trim()) throw badRequest(`"${field}[${i}]" must be a non-empty string.`);
    return v.trim();
  });
}

function httpsUrl(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  const raw = str(value, field, { max: 2048 })!;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw badRequest(`"${field}" is not a valid URL.`);
  }
  if (parsed.protocol !== "https:") throw badRequest(`"${field}" must be an https URL.`);
  return parsed.toString();
}

export interface VendorInput {
  name: string;
  slug: string;
  iconUrl: string | null;
  website?: string;
}

export function parseVendor(body: unknown, { partial = false } = {}): Partial<VendorInput> {
  if (typeof body !== "object" || body === null) throw badRequest("A JSON object body is required.");
  const b = body as Record<string, unknown>;
  const out: Partial<VendorInput> = {};

  if (!partial || b.name !== undefined) {
    out.name = str(b.name, "name", { max: 120 })!;
  }
  if (!partial || b.slug !== undefined || b.name !== undefined) {
    const slug = b.slug !== undefined ? str(b.slug, "slug", { max: 80 })! : slugify(out.name ?? "");
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      throw badRequest('"slug" must be lowercase letters, digits and hyphens.');
    }
    out.slug = slug;
  }
  if (!partial || b.iconUrl !== undefined) out.iconUrl = httpsUrl(b.iconUrl, "iconUrl");
  if (b.website !== undefined) out.website = httpsUrl(b.website, "website") ?? undefined;

  return out;
}

export interface AppInput {
  vendorId: string;
  name: string;
  slug: string;
  aliases: string[];
  iconUrl: string | null;
  documentation?: string;
  notes?: string[];
}

export function parseApp(body: unknown, { partial = false } = {}): Partial<AppInput> {
  if (typeof body !== "object" || body === null) throw badRequest("A JSON object body is required.");
  const b = body as Record<string, unknown>;
  const out: Partial<AppInput> = {};

  if (!partial || b.vendorId !== undefined) out.vendorId = str(b.vendorId, "vendorId", { max: 80 })!;
  if (!partial || b.name !== undefined) out.name = str(b.name, "name", { max: 160 })!;
  if (!partial || b.slug !== undefined || b.name !== undefined) {
    const slug = b.slug !== undefined ? str(b.slug, "slug", { max: 80 })! : slugify(out.name ?? "");
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      throw badRequest('"slug" must be lowercase letters, digits and hyphens.');
    }
    out.slug = slug;
  }
  if (!partial || b.aliases !== undefined) out.aliases = strArray(b.aliases, "aliases");
  // Explicit null is meaningful: it means "inherit the vendor's icon".
  if (!partial || b.iconUrl !== undefined) out.iconUrl = httpsUrl(b.iconUrl, "iconUrl");
  // Present-but-empty clears: the key survives as undefined and drops out of the stored JSON.
  if (b.documentation !== undefined) {
    out.documentation = httpsUrl(b.documentation, "documentation") ?? undefined;
  }
  if (b.notes !== undefined) {
    out.notes = strArray(b.notes, "notes", 20);
    const long = out.notes.findIndex((n) => n.length > 500);
    if (long >= 0) throw badRequest(`"notes[${long}]" is longer than 500 characters.`);
  }

  return out;
}

export function parseLogPath(body: unknown, { partial = false } = {}): Partial<LogPath> {
  if (typeof body !== "object" || body === null) throw badRequest("A JSON object body is required.");
  const b = body as Record<string, unknown>;
  const out: Partial<LogPath> = {};

  if (!partial || b.platform !== undefined) {
    const platform = str(b.platform, "platform", { max: 20 })! as Platform;
    if (!PLATFORMS.includes(platform)) {
      throw badRequest(`"platform" must be one of: ${PLATFORMS.join(", ")}.`);
    }
    out.platform = platform;
  }
  if (!partial || b.label !== undefined) out.label = str(b.label, "label", { max: 80 })!;
  if (!partial || b.path !== undefined) {
    // Stored byte for byte. %LOCALAPPDATA%, ~ and $XDG_STATE_HOME survive
    // intact, because the machine being fixed is not this one. Several paths
    // under one label are one per line.
    out.path = pathLines(str(b.path, "path", { max: 4096 })!).join("\n");
  }
  if (b.note !== undefined) out.note = str(b.note, "note", { max: 500, required: false });
  if (b.variant !== undefined) out.variant = str(b.variant, "variant", { max: 80, required: false });
  // Optional: blank or null means nobody has confirmed it, and clears a stored one.
  if (b.scope !== undefined) {
    const scope = str(b.scope, "scope", { max: 20, required: false }) as Scope | undefined;
    if (scope && !SCOPES.includes(scope)) {
      throw badRequest(`"scope" must be one of: ${SCOPES.join(", ")}.`);
    }
    out.scope = scope;
  }
  if (!partial || b.types !== undefined) {
    const types = strArray(b.types, "types", 16).map((t) => t.toLowerCase());
    const unknown = types.filter((t) => !TYPE_SET.has(t));
    if (unknown.length) {
      throw badRequest(`Unknown type(s): ${unknown.join(", ")}.`, { allowed: [...TYPE_SET] });
    }
    out.types = [...new Set(types)];
  }

  return out;
}
