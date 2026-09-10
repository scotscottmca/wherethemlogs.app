# wherethemlogs.app

A searchable index of application log file locations across Windows, macOS and Linux —
every path qualified by installer type and architecture, printed exactly as the machine
writes it.

Built for the people who need the path mid-incident: IT and endpoint administrators,
application packagers, and anyone else who has lost twenty minutes to a forum thread of
unknown vintage.

## Run it

```bash
npm install
npm run dev     # http://localhost:3777
```

```bash
npm run build && npm start   # production, http://localhost:3777
```

## What's here

| Route | What it does |
|---|---|
| `/` | Aisle sign, scanner field with live type-ahead, recent additions, recent searches, zone filter |
| `/search` | Full results, filterable by platform, installer, architecture and scope |
| `/privacy` | Privacy and cookie notice |
| `/api/search` | Server-side search — `?q=`, `?platform=`, `?type=` (repeatable), `?limit=` |

Keyboard: `/` focuses the scanner from anywhere, arrows walk the type-ahead, `Enter`
commits to the full results, `Shift+Enter` copies the highlighted plate's first path.

## The catalogue

`lib/catalog.ts` currently holds **seed data** — 46 real, verifiable entries, labelled as a
demonstration set in the footer and on the privacy page. It stands in for the database the
product ships with.

`searchCatalog()` is the seam. Replace its body with the DB query; the signature should not
need to change:

```ts
searchCatalog({ q, platform, types, limit }): Entry[]
```

The admin UI and the database itself are not built yet.

Paths preserve environment variables verbatim — `%LOCALAPPDATA%`, `~/Library/Logs`,
`$XDG_STATE_HOME` are never expanded, because the machine being fixed is not this one.

## Contributing an entry

Open an issue. One issue per application, with the platform and installer type in the
title, and say how you verified the path.

Issues are public: do not paste real hostnames, usernames, tenant identifiers or customer
names into one.

## Before this goes live

- [ ] Choose the analytics provider. The consent bar and `/privacy` both state plainly that
      one has not been chosen and that nothing is loaded either way — update both when it is.
- [ ] Replace the seed catalogue with the real index.
- [ ] Build the admin UI and wire `searchCatalog()` to the database.

## Design

`DESIGN.md` records the visual system as built. `PRODUCT.md` records product truth. The
direction contract for the site's surfaces lives in `.impeccable/surfaces/`.

Two rules worth knowing before you touch the CSS:

- **Flat print, no exceptions.** No gradients, no shadows, no floating cards. Structure is
  stencilled rules and hazard tape. Signal cyan on near-black must not drift into neon glow.
- **Two voices.** Archivo for anything human, Spline Sans Mono for anything machine-true —
  paths, codes, counts, filter values. Nothing else.
