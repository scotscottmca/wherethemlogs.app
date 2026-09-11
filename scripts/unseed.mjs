#!/usr/bin/env node
/**
 * Removes the seed catalogue: every vendor and app whose id is in
 * scripts/seed-data.json, which is what scripts/seed.mjs wrote. Anything added
 * since - through the admin portal or an import - has its own id and is left
 * alone.
 *
 *   node scripts/unseed.mjs --endpoint https://<account>.documents.azure.com:443/          # lists, deletes nothing
 *   node scripts/unseed.mjs --endpoint https://<account>.documents.azure.com:443/ --yes    # deletes
 *
 * A seed vendor that now owns an app that is not seed data is kept, and named,
 * so no real app is orphaned. Download an export from /admin/import first if
 * you want a way back - Cosmos has no undo.
 *
 * Auth is the same as the seeder: `az login`, with the Cosmos data-plane role.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const endpoint = arg("endpoint", process.env.COSMOS_ENDPOINT);
const databaseName = arg("database", process.env.COSMOS_DATABASE ?? "wtla");
const confirmed = process.argv.includes("--yes");
if (!endpoint) {
  console.error("Pass --endpoint https://<account>.documents.azure.com:443/ or set COSMOS_ENDPOINT.");
  process.exit(1);
}

const seed = JSON.parse(await readFile(join(here, "seed-data.json"), "utf8"));
const seedVendors = new Set(seed.vendors.map((v) => v.id));
const seedApps = new Set(seed.apps.map((a) => a.id));

const db = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() }).database(databaseName);
const all = async (container) =>
  (await db.container(container).items.query("SELECT c.id, c.vendorId, c.name FROM c").fetchAll()).resources;

const [vendors, apps] = await Promise.all([all("vendors"), all("apps")]);

// Ids, not names: an app moved under a new vendor keeps its id, so it is still found.
const appsToGo = apps.filter((a) => seedApps.has(a.id));
const kept = apps.filter((a) => !seedApps.has(a.id));
const vendorsToGo = [];
const vendorsKept = [];
for (const v of vendors.filter((v) => seedVendors.has(v.id))) {
  const owned = kept.filter((a) => a.vendorId === v.id);
  if (owned.length) vendorsKept.push(`${v.name} (owns ${owned.map((a) => a.name).join(", ")})`);
  else vendorsToGo.push(v);
}

console.log(`Seed data in ${databaseName}: ${vendorsToGo.length} vendors, ${appsToGo.length} apps.`);
console.log(`Left alone: ${vendors.length - vendorsToGo.length} vendors, ${kept.length} apps that are not seed data.`);
for (const line of vendorsKept) console.log(`  kept, still in use: ${line}`);

if (!confirmed) {
  console.log("\nNothing deleted. Run again with --yes to delete the seed records listed above.");
  process.exit(0);
}

for (const a of appsToGo) await db.container("apps").item(a.id, a.vendorId).delete();
for (const v of vendorsToGo) await db.container("vendors").item(v.id, v.id).delete();
console.log(`Deleted ${appsToGo.length} apps and ${vendorsToGo.length} vendors. The site caches for 60s.`);
