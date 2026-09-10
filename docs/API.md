# API reference

Base path `/api`, served from the site's own origin — Static Web Apps proxies
it to the linked Function App.

Everything under `/api/admin` needs the `admin` role. Everything else is
anonymous.

---

## Records

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
  types: string[]       // msi exe msix appx pkg dmg mas deb rpm snap flatpak appimage x86 x64 arm64
  scope: "per-user" | "per-machine" | "system"
}

App {
  id: string
  vendorId: string      // partition key
  slug: string          // unique
  name: string
  aliases: string[]
  iconUrl: string | null   // null MEANS "inherit the vendor's icon"
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
| `q` | Search term. Empty returns the whole index, alphabetically. |
| `platform` | `windows` \| `macos` \| `linux`. Anything else means all. |
| `type` | Repeatable, or comma-separated. Filters **stack** — every type must be true. |
| `limit` | 1–100. Omit for everything. |

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

`matched` counts name matches before platform and type filters — that is what
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

### `GET /api/health`

`200` with document counts, or `503` when the store is unreachable. The deploy
workflow gates on it.

Read endpoints send `cache-control: public, max-age=60, stale-while-revalidate=300`.

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

Omit it and the write applies to whatever is current — last write wins. Send a
stale one and you get `412`, which is the admin portal's cue to reload and
reapply rather than silently clobber a colleague.

### Vendors

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/vendors` | All vendors, by name |
| `POST` | `/api/admin/vendors` | `{ name, slug?, iconUrl?, website? }` — slug derives from name when omitted |
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
| `GET` | `/api/admin/apps` | `?vendorId=` narrows to one partition — cheap. Without it, cross-partition. |
| `POST` | `/api/admin/apps` | `{ vendorId, name, slug?, aliases?, iconUrl? }`. `404`s the vendor if it does not exist. Created with `logPaths: []`. |
| `GET` | `/api/admin/apps/{id}` | `?vendorId=` skips a lookup |
| `PATCH` | `/api/admin/apps/{id}` | Partial. `logPaths` is ignored here — use the log path endpoints. |
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
| `GET` | `/api/admin/apps/{appId}/logpaths` | |
| `POST` | `/api/admin/apps/{appId}/logpaths` | `{ platform, label, path, scope, types?, note?, variant? }` |
| `PATCH` | `/api/admin/apps/{appId}/logpaths/{logPathId}` | Partial |
| `DELETE` | `/api/admin/apps/{appId}/logpaths/{logPathId}` | |

`POST` returns `400` if the same `platform` + `path` + `variant` already exists
on the app. The same path twice on one platform is a duplicate, not a variant.

Create and update return `{ app, logPath }` — the whole app document comes back
so the portal can hold the new `_etag`.

### Icons

`POST /api/admin/icons`

Raw bytes, `Content-Type` one of `image/svg+xml`, `image/png`, `image/webp`,
`image/jpeg`. 512 KB maximum.

```json
{ "url": "https://st….blob.core.windows.net/icons/2026/8f2c….svg", "contentType": "image/svg+xml", "bytes": 4821 }
```

Write that `url` to a vendor's or app's `iconUrl`. The blob is immutable and
cached for a year; replacing an icon means uploading a new one and repointing.
Nothing garbage-collects the old blob — a cleanup job is deliberately not built
yet.

### `GET /api/admin/me`

Who the caller is, per the Static Web App. The portal calls it on load so it
can fail closed with a useful message instead of a bare `403` on first write.

```json
{ "signedIn": true, "isAdmin": true, "userId": "…", "userDetails": "a@b.com", "roles": ["anonymous","authenticated","admin"] }
```

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

- `slug` — `^[a-z0-9][a-z0-9-]*$`, unique per container, derived from `name` when omitted.
- `path` — up to 1024 characters, stored **byte for byte**. Environment variables are never expanded and never normalised.
- `types` — validated against the known list; unknown values are rejected with the full allowed set in `details.allowed`.
- `iconUrl` / `website` — must parse as URLs and must be `https:`.
