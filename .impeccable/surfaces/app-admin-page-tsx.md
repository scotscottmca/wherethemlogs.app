---
version: 1
slug: "app-admin-page-tsx"
primary_target: "app/admin/page.tsx"
related_targets: ["app/admin/v/[vendorId]/page.tsx","app/admin/v/[vendorId]/a/[appId]/page.tsx"]
---

## Scope

The curator's surface: `/admin` (stock control), `/admin/v/new`, `/admin/v/[vendorId]`,
`/admin/v/[vendorId]/a/new`, `/admin/v/[vendorId]/a/[appId]`. Vendors, apps and the log
paths embedded on an app. Visitor mode: **Operate**.

This is an extension of the surface recorded in `app-page-tsx.md`, not a new world. It
inherits DESIGN.md wholesale: flat printed surfaces, signal cyan at region scale, two
voices, zero radius, zero shadow, one authored motion moment. No direction round was run
and no seed key exists, by instruction — an extension resolves purpose, hierarchy, states
and interaction only.

## Audience and job

One or two curators with the Entra `admin` app role, working in short bursts after a
research pass: rack a new vendor, add its apps, type the log paths in, correct a path
someone flagged. They already know the app they came for. They are the same person who
uses the public site, so the surface must not feel like a different product.

## Task and constraints

- Vendors: list, create, edit, delete. A delete that still owns apps returns 409 with the
  blocking apps in `details.apps`; `?cascade=true` is the deliberate second press.
- Apps: list, filter, create, edit, delete, move between vendors. `iconUrl: null` **means**
  inherit the vendor's icon and must stay expressible as its own state.
- Log paths: nested on the app. Platform, label, path, note, variant, `types[]`, scope.
- Paths are stored byte for byte. The editor never normalises, never expands
  `%LOCALAPPDATA%`, `~/Library/Logs` or `$XDG_STATE_HOME`, and says out loud when the
  server's own trim will change what it stores.
- Optimistic concurrency: single-record reads carry an `ETag`, writes send `If-Match`, a
  412 means someone else moved the record and must be recoverable without losing typing.
- Validation errors return `{error, message, details}`; the message names the field.
- Icons: raw bytes to `POST /api/admin/icons`, svg/png/webp/jpeg, 512 KB.
- Server components read `lib/server/`; client components call `/api/…`. Never both ways.

## Direction contract

**THESIS:** The catalogue is a rack, so curating it is putaway — not three CRUD screens
bolted together. One navigable surface walks aisle → bay → label: vendor, app, log path,
with the rail always naming the aisle you are standing in. It refuses the arrangement admin
UI always ships — a modal dialog per record, a toast per outcome, a table with a pencil
icon at the end of every row — because this world has already ruled all three out.

**OWN-WORLD:** Inherited from DESIGN.md without addition. Painted steel `#111311`, signal
cyan `#22D3EE` owning whole cells, bone label stock, stencilled 1px/2px rules and `gap: 0`
between siblings. The one new component family is the **field row**, and it is the
`.prow` path row with an input where the printed path goes: mono label cell on the left,
value cell on the right, one shared vertical rule down the stack, the cell taking the
focus ring the way `.scan__bar` does rather than the input drawing a box. The editor and
the plate are the same object — you are filling in the label that will be printed.

**STORY:** The curator lands, types three letters into the stock filter, and is inside the
right record in two presses. The record's fields are already open — nothing to click to
begin. They fix the path, press SAVE, and the record's own header prints the reading. When
someone else has moved it underneath them, the surface says which fields moved and keeps
their typing. When a delete would destroy a lot, the surface prints the manifest of what
would go rather than asking "are you sure?".

**FIRST VIEWPORT:** Header, then a full-bleed aisle band in the zone band's exact geometry
— hairline-divided cells reading the trail (STOCK CONTROL / vendor / app), the current cell
filled cyan, the signed-in principal stencilled hard to the right edge. Beneath it the bay
header: the record's name in condensed Archivo caps at bench scale, not room scale, with
its slug and counts set in mono beside it. Then the two-column rack — a 260px rail listing
the aisle you are in, and the record itself: fields open, then its children stacked flush
and hairline-separated. The primary action is always a solid cyan cell at the foot of the
fields it commits.

**FORM:** Inherited extension of The Location Code. No concept tournament, no roll and no
seed key: instructed as an extension of the established surface, per new-work.md §3
"Extend an existing surface".

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved

- Cross-instance staleness: admin reads come off the same 60s process snapshot the public
  site uses, invalidated on every write from that instance. A colleague's write on another
  replica can therefore hand you a stale `_etag` — which lands as the 412 recovery this
  surface already designs, not as a silent clobber.
- Nothing garbage-collects a replaced icon blob. Deliberately not built.
