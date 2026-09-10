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

/**
 * Cosmos data-plane access is separate from Azure RBAC, so being Owner on the
 * subscription grants nothing here. A 403 almost always means the signed-in
 * principal has no data-plane role assignment, and the message says which
 * principal was refused — so say what to do about it rather than printing a
 * stack trace at someone who just wants their data in.
 */
function explain(err) {
  if (err?.code !== 403) return null;

  const account = new URL(endpoint).hostname.split(".")[0];
  const principal = /principal \[([0-9a-f-]{36})\]/i.exec(err.body?.message ?? "")?.[1];

  return [
    "",
    "Cosmos refused the connection: this identity has no data-plane role.",
    "",
    "  Azure RBAC and Cosmos data-plane RBAC are separate systems. Being Owner",
    "  on the subscription grants nothing inside the account.",
    "",
    principal ? `  The principal it refused was ${principal}.` : "  Check which identity you are signed in as: az ad signed-in-user show --query id -o tsv",
    "",
    "  Grant it, then run this again:",
    "",
    `    az cosmosdb sql role assignment create \\`,
    `      --account-name ${account} \\`,
    `      --resource-group <resource-group> \\`,
    `      --scope "/" \\`,
    principal ? `      --principal-id ${principal} \\` : `      --principal-id <your-object-id> \\`,
    `      --role-definition-id 00000000-0000-0000-0000-000000000002`,
    "",
    "  To keep it across a clean rebuild, add the id to developerPrincipalIds",
    "  in infra/main.parameters.json and commit it.",
    "",
  ].join("\n");
}

async function upsertAll(container, rows, stamp) {
  let written = 0;
  for (const row of rows) {
    await db.container(container).items.upsert(stamp(row));
    written += 1;
  }
  console.log(`  ${container}: ${written}`);
}

try {
  await upsertAll("vendors", seed.vendors, (v) => ({
    ...v,
    createdAt: v.createdAt ?? now,
    updatedAt: now,
  }));

  await upsertAll("apps", seed.apps, (a) => ({
    ...a,
    createdAt: a.createdAt ?? a.updatedAt ?? now,
    updatedAt: a.updatedAt ?? now,
  }));
} catch (err) {
  const message = explain(err);
  if (message) {
    console.error(message);
    process.exit(1);
  }
  throw err;
}

console.log("Done. The API caches for 60s, so give it a moment before checking /api/summary.");
