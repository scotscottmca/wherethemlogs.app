# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Where Them Logs App (https://wherethemlogs.app) is a searchable index of application log file locations for Windows, macOS and Linux, with an admin portal for curating it. Product context is in `PRODUCT.md`; setup and operations in `docs/DEPLOYMENT.md`; the HTTP API and import format in `docs/API.md`.

## Commands

```powershell
npm run dev          # next dev on :3777 - see the CSP note below before testing anything interactive
npm run typecheck    # tsc --noEmit
npm run build        # what CI runs, after typecheck (CI also builds and boots the Docker image, and lints Bicep)
npx next start -p 3777
node scripts/check-interchange.mjs [base-url] [file.json]   # export, re-import, assert zero writes; optionally preview a file
node scripts/check-request-issue.mjs                         # request-form issues parse as the import-file bot expects
npm run seed -- --endpoint https://<account>.documents.azure.com:443/
node scripts/unseed.mjs --endpoint <same> [--yes]           # removes only records whose ids are in scripts/seed-data.json
```

There is no lint script and no test framework. `scripts/check-interchange.mjs` and `scripts/check-request-issue.mjs` are the runnable checks; CI runs the second, plus `.github/scripts/issue-to-import.cjs`'s self-check.

- **Client components do not hydrate under `next dev`.** The CSP in `next.config.mjs` has no `'unsafe-eval'`, and dev mode needs it. To test type-ahead, the admin editors or the import screen, run `npm run build` and then `npx next start`.
- **There is no local database.** The app talks to Cosmos DB with `DefaultAzureCredential`: key auth is disabled on the account, so run `az login` with an identity that holds the Cosmos data-plane role, and set `COSMOS_ENDPOINT`.
- **`LOCAL_ADMIN_BYPASS=true`** makes every request an admin, because there is no platform auth locally. It is never set in Azure.

## Architecture

One Next.js 16 App Router app (`output: "standalone"`) runs as a single Azure Container App. The data lives in Cosmos DB (serverless), and icons in Blob storage.

- **Server components never call this app's own API.** They import from `lib/server/*` directly. The route handlers under `app/api/` exist for the browser (the search type-ahead and every admin write) and for AI agents: `app/api/mcp` is a stateless MCP server over the same `search()` and snapshot.
- **Model (`lib/model.ts`): Vendor > App > LogPath.**
  - The `vendors` container is partitioned by `/id`; `apps` by `/vendorId`, with log paths embedded in the app document.
  - Moving an app to another vendor changes its partition key, so it is a create in the new partition followed by a delete from the old one.
  - Slugs must be unique across a whole container. Cosmos unique keys only work within a partition, so `lib/server/slugs.ts` enforces this in code.
  - An app with `iconUrl: null` inherits its vendor's icon; `resolveApp` resolves this on read.
- **Reads come from an in-memory snapshot (`lib/server/catalog.ts`).** The whole catalogue is held in the process with a 60s TTL, and search runs in-process at no RU cost.
  - Every write must call `invalidate()`.
  - Admin pages read through the same snapshot (`lib/server/admin.ts`), which is how the editors get `_etag`.
- **Writes use optimistic concurrency.** A write sends the stored `_etag` as `If-Match`. A `412` means someone else changed the record; the admin UI then shows a "superseded" comparison instead of overwriting.
  - Input validation is in `lib/server/validate.ts`, shared by the routes and the importer.
  - All route failures go through `toResponse` in `lib/server/errors.ts`.
- **Result cards ("plates"):** one per app per platform per variant (`toPlates` in `lib/api.ts`).
- **Auth** uses Container Apps built-in auth with Entra ID, single tenant with user assignment required.
  - The app reads the platform's `x-ms-client-principal` header in `lib/server/auth.ts`.
  - An admin is anyone holding the Entra `admin` app role, or anyone on the `ADMIN_GITHUB_LOGINS` allowlist.
  - `proxy.ts` gates `/admin/*` and `/api/admin/*`, and every admin handler calls `requireAdmin` again.
- **Import and export (`lib/server/interchange.ts`)** use the research file format: vendors > apps > logs, with log keys `os`, `path`, `what`.
  - `planImport` is a pure function run against the snapshot. `applyImport` then writes one record at a time; it is not transactional.
  - Rules: a missing key keeps the stored value, an empty one clears it, and an app's `logs` list replaces that app's paths.
  - Exporting and then re-importing the same file must plan zero writes.
- **Infrastructure** is Bicep: `infra/main.bicep` plus `infra/modules/*`.
  - `deploy-app.yml` runs on pushes to `main` that touch app paths. It builds the image in ACR and deploys the whole template with it.
  - `deploy-infra.yml` runs on changes under `infra/**`.
  - Both share one concurrency group, because each deploys the same template and they would otherwise race.
- **Cloudflare sits in front of the site.** The container's ingress allows only Cloudflare's IPv4 ranges (`allowedIngressCidrs`), so the container's own URL returns 403 by design. Smoke tests and health checks go through the public URL.
  - The custom domain binding and its Cloudflare origin certificate are declared in Bicep, so a redeploy does not remove them.
- **Requests** are GitHub issues. `/request` and `/request/correction` post to `app/api/requests`, which files the issue as the `wherethemlogs` GitHub App (`lib/server/github-app.ts`) after Turnstile and a honeypot. `lib/requests.ts` writes the body in the exact markdown of `.github/ISSUE_TEMPLATE/*.yml`, so `.github/workflows/import-file.yml` comments an import file on it either way; change a form label and both must change. Without the App and Turnstile keys the pages link to the GitHub forms.
- **Analytics** is Google Analytics 4, loaded by `<Analytics />` (`components/Consent.tsx`, mounted in the root layout) only after the consent bar's Accept. Nothing from Google loads before an answer or after a Decline; the privacy page's button withdraws consent and deletes the `_ga` cookies. The CSP allows Google's hosts, but no request is made without consent.
- **Credentials:** identity and role grants are given to the owner as commands to run. The Entra client secret exists only as the GitHub secret `AZURE_AAD_CLIENT_SECRET`.

## Design

`DESIGN.md`, `PRODUCT.md` and `.impeccable/surfaces/*` define the visual world: warehouse racking labels, signal cyan `#22D3EE`, Archivo for human text and Spline Sans Mono for machine text (paths, codes, counts), flat surfaces with no gradients. Styles are plain CSS in `app/globals.css` and `app/components.css`.

Class and component names (`plate`, `zone`, `rack`, `bay`, `aisle`) are visual vocabulary only. **Interface copy must use plain words** - search, add, delete, platform, log locations.

## Conventions

- Never write an em-dash or en-dash anywhere - UI copy, docs, comments, commit messages. Use a plain hyphen.
- Commands in docs and instructions for the owner are PowerShell.
- The working tree usually holds the owner's own uncommitted files (`applogs.json`, edits to `package.json`, `scripts/apps.json`, `scripts/find-logs.mjs`, `scripts/log-research/`). Stage files by name; never `git add -A`.
- A `ponytail:` comment marks a deliberate simplification. It names the limit and when to upgrade.
