// Round trip: an export imported straight back must change nothing.
//
// Run against a server where you are an admin - locally that is
//   LOCAL_ADMIN_BYPASS=true npm run dev
// then
//   node scripts/check-interchange.mjs [base-url] [file-to-preview.json]
//
// The optional file is previewed (never applied) and its plan printed.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3777";

const preview = async (body) => {
  const res = await fetch(`${base}/api/admin/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  assert.equal(res.status, 200, `preview answered ${res.status}: ${await res.clone().text()}`);
  return (await res.json()).plan;
};

const exported = await fetch(`${base}/api/admin/export`);
assert.equal(exported.status, 200, `export answered ${exported.status}`);
assert.match(exported.headers.get("content-disposition") ?? "", /attachment; filename="wherethemlogs-export-\d{4}-\d{2}-\d{2}\.json"/);
const text = await exported.text();
const file = JSON.parse(text);

const plan = await preview(text);
assert.deepEqual(plan.errors, []);
assert.equal(plan.writes, 0, `re-importing the export would write:\n${JSON.stringify(plan, null, 2)}`);
assert.deepEqual(plan.logPaths, { create: 0, update: 0, remove: 0 });

const apps = file.vendors.reduce((n, v) => n + v.apps.length, 0);
const logs = file.vendors.reduce((n, v) => n + v.apps.reduce((m, a) => m + a.logs.length, 0), 0);
console.log(`round trip ok: ${file.vendors.length} vendors, ${apps} apps, ${logs} logs, 0 writes`);

if (process.argv[3]) {
  const other = await preview(readFileSync(process.argv[3], "utf8"));
  console.log(JSON.stringify(other, null, 2));
}
