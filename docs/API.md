# API reference

Base path `/api`, served by the same Next.js process that renders the pages.

Everything under `/api/admin` needs the `admin` role. Everything else is
anonymous.

**Server-rendered pages do not use this API.** `app/page.tsx` calls `summary()`
and `app/search/page.tsx` calls `search()` from `lib/server/catalog.ts`
directly, in-process. These routes exist for the browser - the type-ahead - and
for the admin portal, and `/api/mcp` serves AI agents.

---

## Records

Defined once in `lib/model.ts`, imported by both the route handlers and the
browser client.

```ts
Vendor {
  id: string            // uuid
  slug: string          // unique, lowercase, [a-z0-9-]
  name: string
  iconUrl: string | null
  website?: string
  createdAt: string     // ISO 8601
  updatedAt: string
}

LogPath {
  id: string
  platform: "windows" | "macos" | "linux"
  label: string         // "Client logs"
  path: string          // verbatim; %LOCALAPPDATA%, ~, $XDG_STATE_HOME survive intact
  note?: string
  variant?: string      // "Classic (v1)"
  version?: string      // "4.0 and later"; free text, unset = every version
  files?: string[]      // names of the files under a folder path: "AgentExecutor.log"
  types: string[]       // msi exe msix appx pkg dmg mas deb rpm snap flatpak appimage x86 x64 arm64
  scope?: "per-user" | "per-machine" | "system"   // unset = nobody has confirmed it
}

App {
  id: string
  vendorId: string      // partition key
  slug: string          // unique
  name: string
  aliases: string[]
  iconUrl: string | null   // null MEANS "inherit the vendor's icon"
  documentation?: string   // https; the vendor's own page on its logs
  notes?: string[]         // free-text caveats, one per entry
  enableLogging?: string[] // steps to switch on verbose or debug logging, in order
  collectLogs?: string[]   // steps to gather the logs: shortcuts, bundles, commands
  logPaths: LogPath[]      // embedded
  createdAt: string
  updatedAt: string
}
```

Public read endpoints return a **ResolvedApp**: an `App` plus

```ts
vendor: { id, slug, name, iconUrl }
resolvedIconUrl: string | null   // app.iconUrl ?? vendor.iconUrl
platforms: Platform[]            // distinct across logPaths
types: string[]                  // distinct across logPaths
```

---

## Public endpoints

### `GET /api/search`

| Query | Meaning |
| --- | --- |
| `q` | Search term, matched against app names and aliases, and below those the file names listed under a path. Empty returns the whole index, alphabetically. |
| `platform` | `windows` \| `macos` \| `linux`. Anything else means all. |
| `type` | Repeatable, or comma-separated. Filters **stack** - every type must be true. |
| `limit` | 1-100. Omit for everything. |

Filters narrow the log paths as well as the apps: `platform=windows&type=msi`
returns matching apps carrying only their Windows MSI paths, and drops apps
left with none.

```json
{
  "query": "teams",
  "platform": "windows",
  "types": ["msi"],
  "count": 1,
  "matched": 1,
  "results": [ /* ResolvedApp[] */ ]
}
```

`matched` counts name matches before platform and type filters - that is what
drives "3 plates on the pick list · 12 match the query".

### `GET /api/summary`

Home page payload: totals and the six most recently updated apps.

```json
{
  "apps": 33, "vendors": 24, "logPaths": 86,
  "byPlatform": { "windows": 15, "macos": 11, "linux": 12 },
  "recent": [ /* ResolvedApp[] */ ]
}
```

`byPlatform` counts *apps carrying at least one path on that platform*, so the
numbers do not sum to `apps`.

### `GET /api/vendors`

Every vendor, by name.

### `GET /api/apps/{slug}`

One ResolvedApp, or `404`.

### `GET /api/live`

`200` always, as long as the process is answering. Deliberately does not touch
Cosmos: it is what the container's liveness and readiness probes use, and
restarting the last replica because the database is having a bad minute turns a
degraded site into a down one.

### `GET /api/health`

`200` with document counts, or `503` when the store is unreachable. This is the
one that checks Cosmos, and what the deploy workflow gates on.

### `GET /api/me`

Who the caller is, per the platform's authentication.

```json
{ "signedIn": true, "isAdmin": true, "userId": "…", "userDetails": "a@b.com", "identityProvider": "aad", "roles": ["admin"] }
```

Anonymous callers get `{ "signedIn": false, "isAdmin": false, "roles": [] }`.

Deliberately **not** under `/api/admin`: an endpoint whose job is to answer "are
you an admin?" cannot be gated on being one, or a signed-in non-admin receives a
403 instead of an answer.

Read endpoints send `cache-control: public, max-age=60, stale-while-revalidate=300`.

### `POST /api/requests`

What the on-site request forms (`/request`, `/request/correction`) post to.
Each accepted request becomes a public issue on the repository, filed by the
site's GitHub App; the body matches the GitHub issue form's markdown, so the
import-file workflow comments on it as usual. `lib/requests.ts` builds the
issue and `scripts/check-request-issue.mjs` proves the bot can read it.

| Field | |
| --- | --- |
| `kind` | `add` or `correction` |
| `turnstile` | The Cloudflare Turnstile token from the form |
| `website` | The honeypot: must be empty |
| `credit` | Optional `{ github, linkedin, social }`, published on the issue |
| add: `app`, `vendor`, `verification` | Required |
| add: `paths` | `{ windows?, macos?, linux? }`, one path per line, at least one platform |
| add: `aliases`, `variant`, `version`, `installers`, `architectures`, `scope`, `notes` | Optional; choices must be the form's own values |
| correction: `app`, `platform`, `listed`, `problem`, `correct`, `verification` | Required |

Answers `201 { number, url }`. A `400` names the field; `503 requests_off` means
the App or Turnstile keys are not configured; `502` means GitHub refused. Text
fields reject three backticks in a row, because every answer is printed inside
a code fence so that nothing a visitor types can @mention anyone or render a
link.

### `POST /api/mcp`

The catalogue as an [MCP](https://modelcontextprotocol.io) server, for AI
agents. Streamable HTTP, stateless: every request stands alone, there are no
sessions, and responses are plain JSON rather than an event stream. `GET` and
`DELETE` return `405`. [docs/MCP.md](MCP.md) is the standalone version of this
section, for linking at from outside this repository.

| Tool | Arguments | Returns |
| --- | --- | --- |
| `search_log_locations` | `query`, `platform?`, `limit?` (1-25, default 10) | Matching apps, each with its log paths by platform |
| `get_app_log_locations` | `slug` | One app's log paths, or an error result naming the slug |

Search matches app names, aliases and listed file names, the same as
`/api/search`. Results leave
out ids, icons and timestamps, and a `path` holding several lines comes back as
a `paths` list. Request bodies over 64 KB get `413`.

Connect a client, and check the endpoint from a shell:

```powershell
claude mcp add --transport http wherethemlogs https://wherethemlogs.app/api/mcp

Invoke-RestMethod https://wherethemlogs.app/api/mcp -Method Post -ContentType application/json `
  -Headers @{ Accept = 'application/json, text/event-stream' } `
  -Body '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_log_locations","arguments":{"query":"teams"}}}'
```

---

## Admin endpoints

All require the `admin` role. All take and return JSON.

### Concurrency

Reads of a single record return the Cosmos `_etag` in the `ETag` response
header. Send it back as `If-Match` on `PATCH` and `DELETE`:

```http
PATCH /api/admin/vendors/8f2c… HTTP/1.1
If-Match: "0000d1…"
```

Omit it and the write applies to whatever is current - last write wins. Send a
stale one and you get `412`, which is the admin portal's cue to reload and
reapply rather than silently clobber a colleague.

### Vendors

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/vendors` | All vendors, by name |
| `POST` | `/api/admin/vendors` | `{ name, slug?, iconUrl?, website? }` - slug derives from name when omitted |
| `GET` | `/api/admin/vendors/{id}` | Includes `_etag` |
| `PATCH` | `/api/admin/vendors/{id}` | Partial. Only the fields you send change. |
| `DELETE` | `/api/admin/vendors/{id}` | See below |

**Deleting a vendor that still owns apps returns `409`**, with the blocking apps
listed in `details.apps`. Repeat with `?cascade=true` to delete the vendor *and*
its apps (and, since log paths are embedded, their paths). The two-step is
deliberate: a vendor delete is the one operation here that can destroy a lot at
once.

### Apps

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/apps` | `?vendorId=` narrows to one partition - cheap. Without it, cross-partition. |
| `POST` | `/api/admin/apps` | `{ vendorId, name, slug?, aliases?, iconUrl?, documentation?, notes?, enableLogging?, collectLogs? }`. `404`s the vendor if it does not exist. Created with `logPaths: []`. |
| `GET` | `/api/admin/apps/{id}` | `?vendorId=` skips a lookup |
| `PATCH` | `/api/admin/apps/{id}` | Partial. `logPaths` is ignored here - use the log path endpoints. |
| `DELETE` | `/api/admin/apps/{id}` | Takes its log paths with it. No orphans possible. |

`iconUrl: null` is a meaningful value, not an omission: it means *inherit the
vendor's icon*. To clear an app's own icon, send `null` explicitly.

**Changing `vendorId`** moves the app between partitions. The API does the
create-then-delete for you; the app keeps its id.

### Log paths

Log paths are embedded, so every call here is a guarded read-modify-write of
one app. Pass `?vendorId=` to skip the partition lookup.

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/apps/{id}/logpaths` | |
| `POST` | `/api/admin/apps/{id}/logpaths` | `{ platform, label, path, scope?, types?, note?, variant?, version?, files? }` |
| `PATCH` | `/api/admin/apps/{id}/logpaths/{logPathId}` | Partial |
| `DELETE` | `/api/admin/apps/{id}/logpaths/{logPathId}` | |

`scope` is optional: leave it out when nobody has confirmed whose profile the
path lives under, and send `scope: null` on `PATCH` to clear one.

`POST` returns `400` if the same `platform` + `path` + `variant` + `version`
already exists on the app. The same path twice on one platform is a duplicate,
not a variant. `version` is free text ("4.0 and later", "up to 3.6"): it is
printed and matched, never compared, and a path without one holds for every
version. `files` lists the names of the files under a folder path, up to 40
names of 120 characters, names only: one holding a slash is refused with `400`.
Repeats are dropped, order is kept, and an empty list clears the stored one.

Create and update return `{ app, logPath }` - the whole app document comes back
so the portal can hold the new `_etag`.

### Import and export

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/export` | The whole catalogue as one file, `wherethemlogs-export-YYYY-MM-DD.json` |
| `POST` | `/api/admin/import` | The body is the file. Previews only - returns `{ plan, applied: 0 }` and writes nothing |
| `POST` | `/api/admin/import?apply=true` | Plans again against the store, then writes. `400` if the file has problems |

The admin portal drives both from `/admin/import`. The file is vendors > apps > logs:

```json
{
  "vendors": [
    {
      "name": "Contoso",
      "apps": [
        {
          "name": "Contoso Agent",
          "documentation": "https://contoso.example/agent/logs",
          "logs": [
            { "os": "windows", "path": "%PROGRAMDATA%\\Contoso\\Agent\\agent.log", "what": "Agent log" },
            { "os": "all", "path": "~/.contoso/agent/" }
          ],
          "notes": ["The agent writes nothing until it has enrolled."],
          "enableLogging": ["Open Settings > Diagnostics.", "Set `Log level` to `Verbose` and restart the agent."],
          "collectLogs": ["Run `contoso-agent collect --zip` and attach the zip it prints."]
        },
        {
          "name": "Contoso Agent Classic",
          "aliases": ["Contoso Agent v1"],
          "logs": [
            {
              "os": "windows",
              "path": "%PROGRAMDATA%\\Contoso\\Agent\\v1\\agent.log",
              "what": "Agent log",
              "note": "Only present when the v1 MSI was used to install",
              "variant": "Classic (v1)",
              "scope": "per-machine",
              "types": ["msi", "x64"]
            }
          ]
        }
      ]
    }
  ]
}
```

Two apps can share one vendor object, as above - vendors and apps are both
matched by slug, so this is only a convenience for writing the file, not a
grouping requirement. Two apps that are really rival products (Rectangle vs
Magnet, Ice vs Bartender) belong under their own vendor even if the source
material describes them together; two names that are one tightly coupled tool
(APT / dpkg) stay one app under one vendor.

| File key | Stored as | |
| --- | --- | --- |
| `os` | `platform` | `windows`, `macos`, `linux`, or `all` - which is stored as one path per platform |
| `what` | `label` | A new path with no `what` is labelled `Logs` |
| `documentation`, `notes`, `enableLogging`, `collectLogs` | the same | On the app. The two step lists are up to 20 lines of 500 characters; text in backticks prints in mono |

An export also writes the optional keys that make a round trip lossless: vendor
`slug` (only when it is not the name's), `website`, `icon`; app `slug`,
`aliases`, `icon`; log `note`, `variant`, `version`, `files`, `types`, `scope`.

- **Matching.** Vendors and apps match by slug, derived from `name` unless the
  file gives one. A vendor the file repeats is merged: its apps join the first
  entry, which is the one whose `website` and `icon` count. An app found under
  a different vendor is moved there. Log
  paths match by platform and path (and variant and version, when the file
  gives them), and a matched path keeps its id.
- **Missing versus empty.** A missing key leaves the stored value alone; an empty
  one clears it. `logs` is the exception - when present it is the app's whole
  list, and stored paths it leaves out are removed.
- **Nothing else is deleted.** A vendor the import would leave with no apps is
  named in `plan.warnings`, not removed. The usual cause is the file naming it
  differently ("Microsoft Corporation" for "Microsoft").
- **Not a transaction.** Writes run vendors first, one at a time - Cosmos only
  batches inside a partition. A failure stops the run with `409
  import_incomplete`; preview and apply again and the rest is finished.
- 5 MB per file.

`node scripts/check-interchange.mjs` exports, previews the export straight back,
and fails unless that comes to zero writes.

### Icons

`POST /api/admin/icons`

Raw bytes, `Content-Type` one of `image/svg+xml`, `image/png`, `image/webp`,
`image/jpeg`. 512 KB maximum.

```json
{ "url": "https://st….blob.core.windows.net/icons/2026/8f2c….svg", "contentType": "image/svg+xml", "bytes": 4821 }
```

Write that `url` to a vendor's or app's `iconUrl`. The blob is immutable and
cached for a year; replacing an icon means uploading a new one and repointing.
Nothing garbage-collects the old blob - a cleanup job is deliberately not built
yet.

---

## Errors

Every failure is the same shape:

```json
{ "error": "conflict", "message": "…", "details": { } }
```

| Status | `error` | When |
| --- | --- | --- |
| 400 | `bad_request` | Validation. `details` names what was wrong. |
| 401 | `unauthorized` | No principal |
| 403 | `forbidden` | Signed in, no `admin` role |
| 404 | `not_found` | |
| 409 | `conflict` | Duplicate slug, or a vendor that still owns apps |
| 412 | `precondition_failed` | Stale `If-Match` |
| 500 | `internal_error` | Never carries a stack trace |

## Validation rules worth knowing

- `slug` - `^[a-z0-9][a-z0-9-]*$`, derived from `name` when omitted, and unique
  across the whole container. That last part is enforced in the route handlers,
  not by the database: Cosmos unique keys are scoped to a partition, so on
  `vendors` (partitioned by `/id`) one would enforce nothing, and on `apps`
  (partitioned by `/vendorId`) it only makes a slug unique within one vendor. A
  clash returns `409` naming the record that already holds it.
- `path` - up to 4096 characters, stored **byte for byte**. Environment variables are never expanded and never normalised. Several files under one label go one per line (`\n`-separated); each line is trimmed and blank lines are dropped, and the site prints one path per line.
- `types` - validated against the known list; unknown values are rejected with the full allowed set in `details.allowed`.
- `iconUrl` / `website` - must parse as URLs and must be `https:`.
