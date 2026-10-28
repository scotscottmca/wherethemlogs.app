# Benchmarking the MCP server with Scope

[Scope](https://microsoft.github.io/scope/) runs the same task through a coding
agent with and without an MCP server attached and has a judge score the output.
For this site the question is: does attaching `/api/mcp` make Claude Code and
Copilot CLI answer "where does X write its logs" correctly more often than they
do on their own?

Everything lives in `scripts/scope/`:

| File | What |
| --- | --- |
| `tasks.json` | The benchmark suite: 23 prompts, each tagged with a category and the catalogue record that is its ground truth |
| `bench.mjs` | Seeds Scope (MCP server, criteria, profiles), submits the suite, tabulates pass rates |

## What is different from a generic MCP benchmark

- **There is no hosted Scope.** Microsoft publishes the code (MIT) and a Helm
  chart for AKS, nothing you can sign up to. The AKS path needs a cluster,
  Cosmos, Redis, Storage, Key Vault, ACR and two workload identities. The
  Docker Compose stack in the Scope repository runs the same services on a Mac
  with no Azure at all, and that is the right size for this project.
- **Ground truth is the catalogue.** `bench.mjs criteria` reads each task's
  record from `/api/apps/{slug}` and writes the expected paths into the
  criterion prompt, so the suite never drifts from what the site says. If the
  catalogue is wrong the benchmark is wrong with it, which is the point: a
  task that fails on the MCP profile is either a server bug or a catalogue bug.
- **The server is public and read-only**, so Scope points at production. No
  staging endpoint, no token header, nothing to rotate. A new server version
  is tested by deploying it; `server.json` carries the version.
- **Categories follow the data model**, not a generic product: `lookup`
  (one app, one platform), `alias` (the user says vscode, Splunk UF, Zoom),
  `variant` (classic vs new Teams, 1Password 7 vs 8, a path that moved in a
  version), `files` (the names under a folder), `steps` (`collectLogs` and
  `enableLogging`), `negative` (a made-up app, and a web app with no local
  logs).

## Criteria

Two shared criteria and one per task. Criterion ids are stable, so reports
stay comparable when a task's expected paths change.

| Id | Checks |
| --- | --- |
| `writes_answer_md` | The agent wrote `answer.md` |
| `paths_verbatim` | `%LOCALAPPDATA%`, `~`, `$XDG_STATE_HOME` left unexpanded. The server always gets this right; baselines often expand to a made-up user folder |
| `correct_<task>` | The exact paths (or steps) from the catalogue, and no other location stated as fact. Failing this is the hallucination measure |
| `admits_unknown_<task>` | Negative tasks: says it does not know, states no path |

Scope's gates are `select`, `build`, `test`, `run`, `deploy` and are built for
code tasks. Answer-style tasks do not need them; `dependsOn` carries the
ordering (`correct_*` depends on `writes_answer_md`).

## Profiles

| Profile | Worker | MCP |
| --- | --- | --- |
| Copilot CLI baseline | `coder-acp-copilot` | none |
| Copilot CLI + wherethemlogs | `coder-acp-copilot` | `wherethemlogs` |
| Claude Code baseline | `coder-acp-claude-code` | none |
| Claude Code + wherethemlogs | `coder-acp-claude-code` | `wherethemlogs` |

Models come from `COPILOT_MODEL` and `CLAUDE_MODEL`; the valid names are
whatever the model scanners registered, listed in the Portal's profile editor.
Scope's request body takes `profileId` only, and resolves the latest version,
so pin by never editing a profile: make a new one instead.

## Running it

Scope's local stack, on the Mac. Needs Docker, Node 22, pnpm, mkcert, the
GitHub CLI with a Copilot entitlement, and an Anthropic key for the Claude
Code worker. The judge and report models default to GitHub Models through the
same GitHub token.

```powershell
git clone https://github.com/microsoft/scope.git; Set-Location scope
corepack enable; pnpm install --frozen-lockfile
$env:GITHUB_TOKEN = gh auth token
$env:ANTHROPIC_API_KEY = '<key>'
pnpm docker:dev:all          # both workers; first build is slow
pnpm open:portal             # http://localhost:5100, sign in as alice@entralocal.dev
```

Then from this repository, with the project id from the Portal:

```powershell
$env:SCOPE_API_URL = 'http://localhost:3100'
$env:SCOPE_PROJECT_ID = '<project id>'
node scripts/scope/bench.mjs criteria          # review the ground truth before seeding
node scripts/scope/bench.mjs seed              # MCP server, criteria, four profiles
node scripts/scope/bench.mjs run --smoke       # 8 tasks, MCP profiles only, 3 repeats
node scripts/scope/bench.mjs run               # 23 tasks x 4 profiles x 5 repeats = 460 runs
node scripts/scope/bench.mjs results scope-run-2026-10-27.json
```

`results` prints full-pass rate per category per profile. The lift is the MCP
column minus the baseline column for the same agent. Per-criterion verdicts
and the judge's rationale are on each request's Report tab in the Portal; the
ones that fail on the MCP profile are the server's and the catalogue's
backlog.

`bench.mjs` has not yet run against a live Scope. The endpoint paths and body
shapes follow the REST reference; the list envelope and run fields
(`status`, `outcome`) are the first things to check on the first smoke run.

## Things to check on the first run

- **MCPJungle.** Workers reach MCP servers through an MCPJungle gateway
  sidecar, not directly. The server here is stateless streamable HTTP with
  JSON responses and is registered with `sessionMode: stateless`. Confirm a
  run's tool-call log shows `search_log_locations` being called.
- **Cloudflare.** The worker's request to `wherethemlogs.app/api/mcp` is a
  non-browser POST from a residential IP. Bot Fight Mode or a managed
  challenge would turn every MCP run into an infrastructure failure. The site
  is already meant to answer agents, so the fix if it happens is a Cloudflare
  rule, not a token.
- **Baselines can search the web.** Both agents can find wherethemlogs.app
  through search, which makes the lift look smaller than it is. Check a few
  baseline logs for the site's URL; if it shows up, add a no-web variation.
- **Catalogue gaps show up as "failures".** The Slack Windows record is a
  folder with no `logs\` under it, Zoom Workplace has no `zoom` alias in the
  public record. The benchmark will surface these; fix them in the admin
  portal, not in `tasks.json`.

## When it runs

Nothing is automated yet. The order to add it in:

1. By hand, after the local stack is up: smoke set, then a full run, and a
   human read of a sample of verdicts against the catalogue (target: the judge
   agrees on at least 9 in 10).
2. Full run before any change to `app/api/mcp/route.ts` ships.
3. Smoke set from CI on pull requests that touch the MCP route, if a Scope
   instance is reachable from GitHub Actions. With the stack on a Mac it is
   not, so this waits for either a self-hosted runner or an AKS deployment,
   and neither is worth it until step 2 has shown the numbers move.

## Thresholds to agree

| Metric | Proposed |
| --- | --- |
| Full-pass rate, MCP profiles | at least 80% |
| Lift over the same agent's baseline | at least 20 points |
| `correct_*` failures on MCP profiles (hallucination) | at most 5% |
| Any category dropping more than 10 points between runs | blocks the MCP change |
