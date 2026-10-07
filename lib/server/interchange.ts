import { randomUUID } from "node:crypto";
import { ApiError, badRequest } from "./errors";
import { apps as appsContainer, vendors as vendorsContainer } from "./cosmos";
import { invalidate } from "./catalog";
import { parseApp, parseLogPath, parseVendor } from "./validate";
import { PLATFORMS, slugify, type App, type LogPath, type Platform, type Vendor } from "../model";
import type { ImportPlan } from "../admin";

/**
 * The catalogue as one JSON file: vendors > apps > logs.
 *
 * The shape is the research format the catalogue was gathered in (`os`, `path`,
 * `what`, `documentation`, `notes`), so a research pass imports as it stands.
 * `enableLogging` and `collectLogs` are app keys under their model names.
 * Everything else the store holds rides along as optional keys, which is what
 * makes an export followed by an import of the same file change nothing.
 *
 * One rule on import: a missing key leaves the stored value alone, an empty
 * one clears it. `logs` is the exception - when present it is the app's whole
 * list, so a path the file leaves out is removed from that app. Vendors and
 * apps are matched by slug (derived from the name unless given), log paths by
 * platform and path. Nothing else is ever deleted.
 */

export interface FileLog {
  os: Platform | "all";
  path: string;
  what?: string;
  note?: string;
  variant?: string;
  version?: string;
  files?: string[];
  types?: string[];
  scope?: string;
}

export interface FileApp {
  name: string;
  slug?: string;
  aliases?: string[];
  icon?: string | null;
  documentation?: string;
  logs?: FileLog[];
  notes?: string[];
  enableLogging?: string[];
  collectLogs?: string[];
}

export interface FileVendor {
  name: string;
  slug?: string;
  website?: string;
  icon?: string | null;
  apps?: FileApp[];
}

export interface CatalogueFile {
  vendors: FileVendor[];
}

/** What a log with no `what` is labelled. The research format leaves it off often. */
const DEFAULT_LABEL = "Logs";

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/* --- Export --------------------------------------------------------------- */

export function toFile({ vendors, apps }: { vendors: Map<string, Vendor>; apps: App[] }): CatalogueFile {
  return {
    vendors: [...vendors.values()].sort(byName).map((v) => ({
      name: v.name,
      ...(v.slug !== slugify(v.name) ? { slug: v.slug } : {}),
      ...(v.website ? { website: v.website } : {}),
      ...(v.iconUrl ? { icon: v.iconUrl } : {}),
      apps: apps.filter((a) => a.vendorId === v.id).sort(byName).map(fileApp),
    })),
  };
}

function fileApp(a: App): FileApp {
  return {
    name: a.name,
    ...(a.slug !== slugify(a.name) ? { slug: a.slug } : {}),
    ...(a.aliases.length ? { aliases: a.aliases } : {}),
    // Null is "inherit the vendor's icon", which is also what a missing key imports as.
    ...(a.iconUrl ? { icon: a.iconUrl } : {}),
    ...(a.documentation ? { documentation: a.documentation } : {}),
    // Stored order is kept: it decides the order paths print in.
    logs: a.logPaths.map((p) => ({
      os: p.platform,
      path: p.path,
      what: p.label,
      ...(p.note ? { note: p.note } : {}),
      ...(p.variant ? { variant: p.variant } : {}),
      ...(p.version ? { version: p.version } : {}),
      ...(p.files?.length ? { files: p.files } : {}),
      ...(p.types.length ? { types: p.types } : {}),
      ...(p.scope ? { scope: p.scope } : {}),
    })),
    ...(a.notes?.length ? { notes: a.notes } : {}),
    ...(a.enableLogging?.length ? { enableLogging: a.enableLogging } : {}),
    ...(a.collectLogs?.length ? { collectLogs: a.collectLogs } : {}),
  };
}

/* --- Import: plan --------------------------------------------------------- */

export type Write =
  | { kind: "vendor"; doc: Vendor; etag?: string }
  | { kind: "app"; doc: App; etag?: string; fromVendorId?: string };

type Row = Record<string, unknown>;
const isRow = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);

/** Only the keys the file actually carries, so absent stays distinguishable from empty. */
function present(source: Row, map: Record<string, string>): Row {
  const out: Row = {};
  for (const [from, to] of Object.entries(map)) if (source[from] !== undefined) out[to] = source[from];
  return out;
}

/** A stored document without Cosmos's system properties. */
function bare<T extends object>(doc: T): T {
  return Object.fromEntries(Object.entries(doc).filter(([k]) => !k.startsWith("_"))) as T;
}

/** The validators name model fields; the file calls two of them something else. */
const inFileTerms = (message: string) =>
  message.replace(/"label"/g, '"what"').replace(/"platform"/g, '"os"').replace(/"iconUrl"/g, '"icon"');

const sameVendor = (a: Vendor, b: Vendor) =>
  a.name === b.name && a.slug === b.slug && a.iconUrl === b.iconUrl && (a.website ?? null) === (b.website ?? null);

const pathShape = (p: LogPath) =>
  [
    p.id, p.platform, p.label, p.path, p.note ?? null, p.variant ?? null, p.version ?? null,
    (p.files ?? []).join("\n"), p.types.join(" "), p.scope ?? null,
  ];

const appShape = (a: App) =>
  JSON.stringify([
    a.vendorId, a.name, a.slug, a.aliases, a.iconUrl, a.documentation ?? null, a.notes ?? [],
    a.enableLogging ?? [], a.collectLogs ?? [],
    a.logPaths.map(pathShape),
  ]);

export function planImport(
  raw: unknown,
  { vendors, apps }: { vendors: Map<string, Vendor>; apps: App[] },
): { plan: ImportPlan; writes: Write[] } {
  if (!isRow(raw) || !Array.isArray(raw.vendors)) {
    throw badRequest('The file must be a JSON object with a "vendors" array.');
  }

  const plan: ImportPlan = {
    vendors: { create: [], update: [], unchanged: 0 },
    apps: { create: [], update: [], move: [], unchanged: 0 },
    logPaths: { create: 0, update: 0, remove: 0 },
    writes: 0,
    warnings: [],
    errors: [],
  };
  const vendorWrites: Write[] = [];
  const appWrites: Write[] = [];

  const vendorBySlug = new Map([...vendors.values()].map((v) => [v.slug, v]));
  const appBySlug = new Map(apps.map((a) => [a.slug, a]));
  const seenVendors = new Map<string, Vendor>();
  const seenApps = new Map<string, string>();
  /** Vendors an app in the file lands under, and how many apps each existing vendor loses. */
  const receiving = new Set<string>();
  const movedAway = new Map<string, number>();
  const now = new Date().toISOString();

  const attempt = <T,>(where: string, fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      plan.errors.push(`${where}: ${inFileTerms(err.message)}`);
      return undefined;
    }
  };

  raw.vendors.forEach((fv, i) => {
    const vWhere = isRow(fv) && typeof fv.name === "string" ? fv.name : `vendors[${i}]`;
    if (!isRow(fv) || typeof fv.name !== "string") {
      plan.errors.push(`${vWhere}: every vendor needs a "name".`);
      return;
    }
    const input = attempt(vWhere, () =>
      parseVendor(present(fv, { name: "name", slug: "slug", icon: "iconUrl", website: "website" }), { partial: true }),
    );
    if (!input) return;

    const slug = input.slug!;
    const existing = vendorBySlug.get(slug);
    let vendor = seenVendors.get(slug);
    if (vendor) {
      // A repeat entry is a writing convenience: its apps join the first entry's.
      plan.warnings.push(`${vWhere}: repeated in the file; its apps were merged into the first entry.`);
    } else if (existing) {
      vendor = { ...bare(existing), ...input, name: input.name!, slug } as Vendor;
      if (sameVendor(existing, vendor)) plan.vendors.unchanged++;
      else {
        vendor.updatedAt = now;
        plan.vendors.update.push(vendor.name);
        vendorWrites.push({ kind: "vendor", doc: vendor, etag: existing._etag });
      }
    } else {
      vendor = {
        id: randomUUID(),
        slug,
        name: input.name!,
        iconUrl: input.iconUrl ?? null,
        ...(input.website ? { website: input.website } : {}),
        createdAt: now,
        updatedAt: now,
      };
      plan.vendors.create.push(vendor.name);
      vendorWrites.push({ kind: "vendor", doc: vendor });
    }
    seenVendors.set(slug, vendor);

    if (fv.apps !== undefined && !Array.isArray(fv.apps)) {
      plan.errors.push(`${vWhere}: "apps" must be an array.`);
      return;
    }

    (fv.apps ?? []).forEach((fa: unknown, j: number) => {
      const aWhere = `${vWhere} > ${isRow(fa) && typeof fa.name === "string" ? fa.name : `apps[${j}]`}`;
      if (!isRow(fa) || typeof fa.name !== "string") {
        plan.errors.push(`${aWhere}: every app needs a "name".`);
        return;
      }
      const appIn = attempt(aWhere, () =>
        parseApp(
          present(fa, {
            name: "name", slug: "slug", aliases: "aliases", icon: "iconUrl",
            documentation: "documentation", notes: "notes",
            enableLogging: "enableLogging", collectLogs: "collectLogs",
          }),
          { partial: true },
        ),
      );
      if (!appIn) return;

      const appSlug = appIn.slug!;
      const clash = seenApps.get(appSlug);
      if (clash) {
        plan.errors.push(`${aWhere}: the slug "${appSlug}" is already used by ${clash} in this file.`);
        return;
      }
      seenApps.set(appSlug, aWhere);

      const current = appBySlug.get(appSlug);
      const logPaths = fa.logs === undefined ? (current?.logPaths ?? []) : planPaths(fa.logs, current, aWhere);
      if (!logPaths) return;

      const next: App = current
        ? { ...bare(current), ...appIn, name: appIn.name!, slug: appSlug, vendorId: vendor.id, logPaths }
        : {
            id: randomUUID(),
            vendorId: vendor.id,
            slug: appSlug,
            name: appIn.name!,
            aliases: appIn.aliases ?? [],
            iconUrl: appIn.iconUrl ?? null,
            ...(appIn.documentation ? { documentation: appIn.documentation } : {}),
            ...(appIn.notes?.length ? { notes: appIn.notes } : {}),
            ...(appIn.enableLogging?.length ? { enableLogging: appIn.enableLogging } : {}),
            ...(appIn.collectLogs?.length ? { collectLogs: appIn.collectLogs } : {}),
            logPaths,
            createdAt: now,
            updatedAt: now,
          };

      receiving.add(vendor.id);
      if (!current) {
        plan.apps.create.push(next.name);
        appWrites.push({ kind: "app", doc: next });
      } else if (current.vendorId !== vendor.id) {
        next.updatedAt = now;
        plan.apps.move.push({
          name: next.name,
          from: vendors.get(current.vendorId)?.name ?? "an unknown vendor",
          to: vendor.name,
        });
        appWrites.push({ kind: "app", doc: next, fromVendorId: current.vendorId });
        movedAway.set(current.vendorId, (movedAway.get(current.vendorId) ?? 0) + 1);
      } else if (appShape(current) !== appShape(next)) {
        next.updatedAt = now;
        plan.apps.update.push(next.name);
        appWrites.push({ kind: "app", doc: next, etag: current._etag });
      } else {
        plan.apps.unchanged++;
      }
    });
  });

  /** The file's logs for one app, matched onto what that app already carries. */
  function planPaths(logs: unknown, current: App | undefined, aWhere: string): LogPath[] | undefined {
    if (!Array.isArray(logs)) {
      plan.errors.push(`${aWhere}: "logs" must be an array.`);
      return undefined;
    }
    const unclaimed = [...(current?.logPaths ?? [])];
    const out: LogPath[] = [];
    const seen = new Set<string>();
    let failed = false;

    logs.forEach((fl: unknown, k: number) => {
      const lWhere = `${aWhere} > logs[${k}]`;
      if (!isRow(fl)) {
        plan.errors.push(`${lWhere}: each log must be an object.`);
        failed = true;
        return;
      }
      if (fl.os !== "all" && !PLATFORMS.includes(fl.os as Platform)) {
        plan.errors.push(`${lWhere}: "os" must be one of: ${PLATFORMS.join(", ")}, all.`);
        failed = true;
        return;
      }
      // "all" is a research shorthand; the store keeps one path per platform.
      for (const platform of fl.os === "all" ? PLATFORMS : [fl.os as Platform]) {
        const input = attempt(lWhere, () =>
          parseLogPath(
            {
              platform,
              ...present(fl, {
                path: "path", what: "label", note: "note", variant: "variant", version: "version",
                files: "files", types: "types", scope: "scope",
              }),
            },
            { partial: true },
          ),
        );
        if (!input) {
          failed = true;
          return;
        }
        if (!input.path) {
          plan.errors.push(`${lWhere}: "path" is required.`);
          failed = true;
          return;
        }

        const key = `${platform}\n${input.path}\n${input.variant ?? ""}\n${input.version ?? ""}`;
        if (seen.has(key)) {
          plan.warnings.push(`${lWhere}: ${input.path} is listed twice for ${platform}. The first one is kept.`);
          continue;
        }
        seen.add(key);

        // A variant or version in the file pins the match; without one, the
        // first path on that platform with the same text is the same path.
        const at = unclaimed.findIndex(
          (p) =>
            p.platform === platform &&
            p.path === input.path &&
            (fl.variant === undefined || (p.variant ?? "") === (input.variant ?? "")) &&
            (fl.version === undefined || (p.version ?? "") === (input.version ?? "")),
        );
        const matched = at >= 0 ? unclaimed.splice(at, 1)[0]! : undefined;

        if (matched) {
          const next = { ...matched, ...input, platform, id: matched.id } as LogPath;
          if (JSON.stringify(pathShape(next)) !== JSON.stringify(pathShape(matched))) plan.logPaths.update++;
          out.push(next);
        } else {
          plan.logPaths.create++;
          out.push({
            id: randomUUID(),
            platform,
            label: input.label ?? DEFAULT_LABEL,
            path: input.path,
            types: input.types ?? [],
            ...(input.scope ? { scope: input.scope } : {}),
            ...(input.note ? { note: input.note } : {}),
            ...(input.variant ? { variant: input.variant } : {}),
            ...(input.version ? { version: input.version } : {}),
            ...(input.files ? { files: input.files } : {}),
          });
        }
      }
    });

    if (failed) return undefined;
    plan.logPaths.remove += unclaimed.length;
    return out;
  }

  // The usual cause is a file naming a vendor differently ("Microsoft
  // Corporation" for "Microsoft"): the apps move and the old vendor is left empty.
  for (const v of vendors.values()) {
    const owned = apps.filter((a) => a.vendorId === v.id).length;
    if (owned && owned === movedAway.get(v.id) && !receiving.has(v.id)) {
      plan.warnings.push(
        `${v.name} would be left with no apps. If the file means the same vendor, use that name instead; otherwise delete ${v.name} afterwards.`,
      );
    }
  }

  const writes = [...vendorWrites, ...appWrites];
  plan.writes = writes.length;
  return { plan, writes };
}

/* --- Import: apply -------------------------------------------------------- */

const guard = (etag?: string) =>
  etag ? { accessCondition: { type: "IfMatch" as const, condition: etag } } : undefined;

/**
 * Vendors first, so every app lands under a vendor that exists.
 *
 * `ponytail: sequential, not transactional - Cosmos only batches inside one
 * partition, and every vendor is its own. A failure stops the run where it is;
 * previewing again compares the file with what is stored now, so a second run
 * finishes the rest. Fine at hundreds of records; bulk it past thousands.`
 */
export async function applyImport(writes: Write[]): Promise<number> {
  let done = 0;
  try {
    for (const w of writes) {
      if (w.kind === "vendor") {
        if (w.etag) await vendorsContainer().item(w.doc.id, w.doc.id).replace(w.doc, guard(w.etag));
        else await vendorsContainer().items.create(w.doc);
      } else if (w.fromVendorId) {
        // A new vendor is a new partition: create there, then delete the old copy.
        await appsContainer().items.create(w.doc);
        await appsContainer().item(w.doc.id, w.fromVendorId).delete();
      } else if (w.etag) {
        await appsContainer().item(w.doc.id, w.doc.vendorId).replace(w.doc, guard(w.etag));
      } else {
        await appsContainer().items.create(w.doc);
      }
      done++;
    }
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code !== 412) console.error("Import stopped partway", err);
    throw new ApiError(
      409,
      "import_incomplete",
      `Stopped after ${done} of ${writes.length} writes: ${
        code === 412 ? "a record was edited while the import ran" : "the store refused a write"
      }. Nothing is rolled back. Preview the file again - it is compared with what is stored now, so a second run finishes the rest.`,
    );
  } finally {
    invalidate();
  }
  return done;
}
