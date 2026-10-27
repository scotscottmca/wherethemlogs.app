#!/usr/bin/env node
// Benchmarks the MCP server with Scope (https://microsoft.github.io/scope/).
// Baseline profiles run without the server, variation profiles with it; the
// difference in pass rate is the lift. docs/SCOPE.md explains the setup.
//
//   node scripts/scope/bench.mjs criteria              print the criteria built from the live catalogue
//   node scripts/scope/bench.mjs seed                  upsert MCP server, criteria and profiles into Scope
//   node scripts/scope/bench.mjs run [--smoke] [--count N] [--out file]
//   node scripts/scope/bench.mjs results <file>
//
// Env: SCOPE_API_URL, SCOPE_PROJECT_ID (required), SCOPE_TOKEN (bearer, if the
// deployment has auth), WTLA_URL (default https://wherethemlogs.app),
// COPILOT_MODEL, CLAUDE_MODEL.
import { readFileSync, writeFileSync } from "node:fs";

const SITE = process.env.WTLA_URL ?? "https://wherethemlogs.app";
const MCP_SLUG = "wherethemlogs";
const tasks = JSON.parse(readFileSync(new URL("./tasks.json", import.meta.url), "utf8"));

// Baseline and variation differ only in mcpServers, so the lift has one cause.
const PROFILES = [
  ["coder-acp-copilot", "Copilot CLI", process.env.COPILOT_MODEL ?? "gpt-4o"],
  ["coder-acp-claude-code", "Claude Code", process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5"],
].flatMap(([workerType, agent, model]) => [
  { name: `${agent} baseline`, workerType, model, mcpServers: [] },
  { name: `${agent} + wherethemlogs`, workerType, model, mcpServers: [MCP_SLUG] },
]);

const SHARED = [
  { id: "writes_answer_md", prompt: "Writes the answer to a file named answer.md." },
  {
    id: "paths_verbatim",
    dependsOn: ["writes_answer_md"],
    prompt:
      "Every log path in answer.md is written as the application documents it: environment variables such as %LOCALAPPDATA% or %APPDATA%, ~ and $XDG_STATE_HOME are left unexpanded, not resolved to a specific user's folders.",
  },
];

async function getJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

function scope(method, path, body) {
  const { SCOPE_API_URL, SCOPE_PROJECT_ID, SCOPE_TOKEN } = process.env;
  if (!SCOPE_API_URL || !SCOPE_PROJECT_ID) throw new Error("Set SCOPE_API_URL and SCOPE_PROJECT_ID.");
  const url = new URL(`/api/v1${path}`, SCOPE_API_URL);
  url.searchParams.set("projectId", SCOPE_PROJECT_ID);
  return getJson(url, {
    method,
    headers: { "content-type": "application/json", ...(SCOPE_TOKEN ? { authorization: `Bearer ${SCOPE_TOKEN}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// ponytail: list endpoints' envelope is undocumented; accept a bare array or the usual wrappers.
const items = (x) => (Array.isArray(x) ? x : x.items ?? x.data ?? x.results ?? []);

/** Ground truth is the catalogue itself, read when the criteria are built. */
async function reference(task) {
  const app = await getJson(new URL(`/api/apps/${task.slug}`, SITE));
  if (task.field) return (app[task.field] ?? []).map((step, i) => `${i + 1}. ${step}`).join("\n");
  const paths = app.logPaths.filter(
    (p) => (!task.platform || p.platform === task.platform) && (!task.variant || p.variant === task.variant),
  );
  if (!paths.length) throw new Error(`${task.id}: nothing in the catalogue matches`);
  return paths
    .map((p) => `- ${p.path}${p.variant ? ` (${p.variant})` : ""}${p.files?.length ? `\n  files: ${p.files.join(", ")}` : ""}`)
    .join("\n");
}

const taskCriterionId = (task) => `${task.category === "negative" ? "admits_unknown" : "correct"}_${task.id}`;
const criteriaFor = (task) => [...SHARED.map((c) => c.id), taskCriterionId(task)];

async function buildCriteria() {
  const perTask = await Promise.all(
    tasks.map(async (task) => ({
      id: taskCriterionId(task),
      dependsOn: ["writes_answer_md"],
      prompt:
        task.category === "negative"
          ? "answer.md says the log location is not known, not documented or does not apply (for example a web app with no local log files), and states no log path as fact."
          : task.field
            ? `answer.md gives these steps, with the same meaning and in this order (wording may differ):\n${await reference(task)}`
            : `answer.md gives exactly these log locations, verbatim, and states no other location as fact:\n${await reference(task)}`,
    })),
  );
  return [...SHARED, ...perTask];
}

async function seed() {
  await scope("POST", "/mcp/servers", {
    _id: MCP_SLUG,
    name: "Where Them Logs",
    type: "http",
    url: `${SITE}/api/mcp`,
    sessionMode: "stateless",
    description: "Where application log files live on Windows, macOS and Linux.",
  });
  const seeded = await scope("POST", "/criteria/seed", { criteria: await buildCriteria() });
  console.log(`criteria seeded: ${seeded.seeded}`, seeded.errors?.length ? seeded.errors : "");
  const existing = items(await scope("GET", "/profiles")).map((p) => p.name);
  for (const profile of PROFILES.filter((p) => !existing.includes(p.name))) {
    await scope("POST", "/profiles", profile);
    console.log(`profile created: ${profile.name}`);
  }
}

async function run(argv) {
  const smoke = argv.includes("--smoke");
  const flag = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
  const count = Number(flag("--count", smoke ? 3 : 5));
  const out = flag("--out", `scope-run-${new Date().toISOString().slice(0, 10)}.json`);
  const wanted = PROFILES.filter((p) => !smoke || p.mcpServers.length).map((p) => p.name);
  const profiles = items(await scope("GET", "/profiles")).filter((p) => wanted.includes(p.name));
  if (profiles.length !== wanted.length) throw new Error("Profiles missing; run seed first.");
  const submitted = [];
  for (const task of tasks.filter((t) => !smoke || t.smoke)) {
    for (const profile of profiles) {
      const res = await scope("POST", "/requests", {
        scenario: { task: task.prompt, criteria: criteriaFor(task) },
        profileId: profile.id ?? profile._id,
        count, // Scope repeats a request itself: count is 1-10.
      });
      for (const r of [res].flat()) submitted.push({ id: r.id, task: task.id, category: task.category, profile: profile.name });
    }
  }
  writeFileSync(out, JSON.stringify(submitted, null, 2));
  console.log(`${submitted.length} requests submitted; ids in ${out}`);
}

async function results(file) {
  const submitted = JSON.parse(readFileSync(file, "utf8"));
  const cells = {}; // category -> profile -> [passed, done]
  for (const r of submitted) {
    for (const run of items(await scope("GET", `/requests/${r.id}/runs`))) {
      if (run.status !== "done") continue;
      const cell = ((cells[r.category] ??= {})[r.profile] ??= [0, 0]);
      cell[1]++;
      if (run.outcome === "succeeded") cell[0]++;
    }
  }
  const names = PROFILES.map((p) => p.name);
  const pct = ([p, n]) => (n ? `${Math.round((100 * p) / n)}% (${n})` : "-");
  console.table(
    Object.fromEntries(
      Object.entries(cells).map(([cat, byProfile]) => [cat, Object.fromEntries(names.map((n) => [n, pct(byProfile[n] ?? [0, 0])]))]),
    ),
  );
  // ponytail: per-criterion verdicts and rationale are in the Portal's Report tab;
  // read them from the API once its shape is confirmed on a real run.
}

const [cmd, ...argv] = process.argv.slice(2);
const commands = {
  criteria: async () => console.log(JSON.stringify(await buildCriteria(), null, 2)),
  seed,
  run: () => run(argv),
  results: () => results(argv[0] ?? (() => { throw new Error("results <file>"); })()),
};
if (!commands[cmd]) {
  console.error("usage: bench.mjs criteria | seed | run [--smoke] [--count N] [--out file] | results <file>");
  process.exit(2);
}
commands[cmd]().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
