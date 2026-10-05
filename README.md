# wherethemlogs.app

[![Where Them Logs MCP connector - tool definition quality and endpoint health on Glama](https://glama.ai/mcp/connectors/app.wherethemlogs/log-locations/badges/score.svg)](https://glama.ai/mcp/connectors/app.wherethemlogs/log-locations)
[![smithery badge](https://smithery.ai/badge/scott-8old/where-them-logs)](https://smithery.ai/servers/scott-8old/where-them-logs)

A searchable index of application log file locations across Windows, macOS and Linux -
every path qualified by installer type and architecture, printed exactly as the machine
writes it.

Built for the people who need the path mid-incident: IT and endpoint administrators,
application packagers, and anyone else who has lost twenty minutes to a forum thread of
unknown vintage.

## Layout

```
app/                  pages, route handlers, proxy - Next.js 16
components/  lib/     UI, shared model, server-only data access
infra/                Azure resources - Bicep
scripts/              seed data and the seeder
docs/                 architecture, API reference, deployment, MCP, answer engines
```

One application, one image. Pages are server-rendered from Cosmos; route
handlers under `app/api/` serve the browser and the admin portal from the same
process.

## Run it

```bash
npm install
LOCAL_ADMIN_BYPASS=true \
COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/ \
COSMOS_DATABASE=wtla \
npm run dev            # http://localhost:3777
```

Needs `az login` with an account that holds the Cosmos data-plane role. Full
setup is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## What's here

| Route | What it does |
|---|---|
| `/` | Title sign, search field with live type-ahead, recent additions, recent searches, platform filter |
| `/search` | Full results, filterable by platform, installer, architecture and scope |
| `/privacy` | Privacy and cookie notice |
| `/admin` | Admin portal - vendors, apps and log paths, with JSON import and export at `/admin/import`. Entra sign-in, `admin` role. API in [docs/API.md](docs/API.md). |

Keyboard: `/` focuses the search field from anywhere, arrows walk the type-ahead, `Enter`
commits to the full results, `Shift+Enter` copies the highlighted result's first path.

## The catalogue

`Vendor > App > LogPath`. One vendor has many apps; one app has many log paths,
embedded on the app document. Every vendor carries an icon and every app may
override it - `App.iconUrl: null` means *inherit the vendor's*, resolved on read.

Currently **seed data**: 24 vendors, 33 apps, 86 log paths in
`scripts/seed-data.json`, all real and verifiable, labelled as a demonstration
set in the footer and on the privacy page.

```bash
npm run seed -- --endpoint https://<account>.documents.azure.com:443/
```

Paths are stored byte for byte - `%LOCALAPPDATA%`, `~/Library/Logs`,
`$XDG_STATE_HOME` are never expanded, because the machine being fixed is not
this one.

## Contributing an entry

Open an issue. One issue per application, with the platform and installer type in the
title, and say how you verified the path.

Issues are public: do not paste real hostnames, usernames, tenant identifiers or customer
names into one.

## Before this goes live

- [ ] Register the Entra ID app, add the `admin` app role, and set the `AUTH_CLIENT_ID` / `AUTH_TENANT_ID` repository variables. Until then `/admin` has nowhere to send you. [docs/DEPLOYMENT.md § 7](docs/DEPLOYMENT.md).
- [x] Choose the analytics provider - Google Analytics 4, loaded only after Accept (`components/Consent.tsx`).
- [ ] Replace the seed catalogue with the real index - `/admin/import` takes the research JSON.
- [x] Build the admin UI on top of the CRUD API.
- [x] Make the repo public - requests and corrections are issues here, from the forms in `.github/ISSUE_TEMPLATE/`.

## Infrastructure

Azure Container Apps runs the image; Cosmos DB (serverless) and Blob Storage sit
behind it, both reached by managed identity - no keys anywhere. Deploys are a
new revision, so rolling back is a traffic shift rather than a rebuild.

Around **$20/month**. Why each piece, and what it costs, is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Design

`DESIGN.md` records the visual system as built. `PRODUCT.md` records product truth. The
direction contract for the site's surfaces lives in `.impeccable/surfaces/`.

Two rules worth knowing before you touch the CSS:

- **Flat print, no exceptions.** No gradients, no shadows, no floating cards. Structure is
  stencilled rules and hazard tape. Signal cyan on near-black must not drift into neon glow.
- **Two voices.** Archivo for anything human, Spline Sans Mono for anything machine-true -
  paths, codes, counts, filter values. Nothing else.
