#!/usr/bin/env node
/**
 * Seeds Cosmos from scripts/seed-data.json.
 *
 * Idempotent: records are upserted by id, so re-running replaces rather than
 * duplicates. It never deletes — a record removed from the JSON stays in the
 * database, because this is a seeder, not a sync.
 *
 *   node scripts/seed.mjs --endpoint https://<account>.documents.azure.com:443/
 *
 * Auth is Entra ID via DefaultAzureCredential: `az login` first, and make sure
 * your account holds the Cosmos data-plane role (see docs/DEPLOYMENT.md).
 * The account has key auth disabled, so there is no connection string to use.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const here = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const endpoint = arg("endpoint", process.env.COSMOS_ENDPOINT);
const databaseName = arg("database", process.env.COSMOS_DATABASE ?? "wtla");
const dryRun = process.argv.includes("--dry-run");

if (!endpoint) {
  console.error("Pass --endpoint https://<account>.documents.azure.com:443/ or set COSMOS_ENDPOINT.");
  process.exit(1);
}

const seed = JSON.parse(await readFile(join(here, "seed-data.json"), "utf8"));
const now = new Date().toISOString();

console.log(
  `Seeding ${seed.vendors.length} vendors, ${seed.apps.length} apps, ` +
    `${seed.apps.reduce((n, a) => n + a.logPaths.length, 0)} log paths into ${databaseName}`,
);

if (dryRun) {
  console.log("--dry-run: nothing written.");
  process.exit(0);
}

const client = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
const db = client.database(databaseName);

let written = 0;
for (const vendor of seed.vendors) {
  await db.container("vendors").items.upsert({
    ...vendor,
    createdAt: vendor.createdAt ?? now,
    updatedAt: now,
  });
  written += 1;
}
console.log(`  vendors: ${written}`);

written = 0;
for (const app of seed.apps) {
  await db.container("apps").items.upsert({
    ...app,
    createdAt: app.createdAt ?? app.updatedAt ?? now,
    updatedAt: app.updatedAt ?? now,
  });
  written += 1;
}
console.log(`  apps: ${written}`);
console.log("Done. The API caches for 60s, so give it a moment before checking /api/summary.");
