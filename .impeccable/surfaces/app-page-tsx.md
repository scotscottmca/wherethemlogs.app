---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/search/page.tsx","app/privacy/page.tsx"]
---

## Scope

The Where Them Logs App front end: home (`app/page.tsx`), search results (`app/search/page.tsx`), privacy (`app/privacy/page.tsx`), plus the cookie consent prompt and the shared chrome. Visitor mode: **Operate** — the visitor came to retrieve one exact path, usually mid-incident.

## Audience and job

IT and endpoint administrators, application packagers, technical enthusiasts. They already know the app name. The job is: type it, get the correct path, copy it, leave. Packagers additionally need the path qualified by installer type and architecture (MSI / EXE / x86 / x64), which is the product's differentiator.

## Task and constraints

- Home is single-screen: header + logo, search bar, recent searches, recent additions, platform filter (Windows / macOS / Linux, default All).
- Type-ahead shows the most likely result live; Enter commits to `/search`, which lists all matches, filterable by platform and by type.
- Privacy page; cookie consent prompt for usage tracking with a genuine, equally-weighted decline.
- "Request an app" links to GitHub Issues — repo URL is an unresolved placeholder in one constant.
- Catalogue entries are labelled **seed data**: real, verifiable paths, no invented entry counts, contributor counts, or usage statistics.
- Paths preserve environment variables (`%LOCALAPPDATA%`, `~/Library/Logs`, `$XDG_STATE_HOME`) verbatim; never expanded.

## Direction contract

**THESIS:** A log path is a location code, so this is a warehouse aisle, not a documentation site. It refuses the arrangement this category always ships — centred hero, ⌘K modal, sidebar nav, cards in a grid — and refuses the terminal-green cliché that is its predictable opposite. The page is a wall of racking: overhead bay sign, high-vis label plates, and a scanner field.

**OWN-WORLD:** Near-black ground (#111311) as painted steel; signal cyan (#22D3EE) as the high-vis field — the user pinned this mid-build, replacing the safety yellow the direction was presented with; the layout was explicitly to stay unchanged, owning whole regions rather than accenting; bone label stock (#E8E4DA); cobalt (#2C6FE8) and hazard red (#D8442F) as zone codes only. Flat printed surfaces, zero gradients, zero soft shadows. Structure is stencilled rules and floor-tape banding, never borders on cards. Two voices, strictly assigned: Archivo (variable width, condensed and heavy) for anything human; Spline Sans Mono for anything machine-true — paths, codes, counts, filter values. Every element sits hard against a shared grid with no floating containers.

**STORY:** The visitor understands in one glance that this is a location index, not an article. They believe it because the first thing they see is a real path at a size they can read across a room, qualified by OS and installer type. They type, they copy, they go.

**FIRST VIEWPORT:** Full-bleed floor-tape zone banding across the very top edge carrying the platform tabs (ALL / WIN / MAC / LNX). Beneath it, hard to the left margin, the aisle sign: WHERE THEM LOGS AT in Archivo condensed black at the largest scale the viewport allows, with the bay code WTLA·01 stencilled beside it. Directly under, the scanner field — a full-width safety-yellow bar, black caret, mono placeholder — is the primary action and sits above the fold at all widths. Typing drops the type-ahead as a stack of label plates directly beneath the bar, each plate: OS zone band down its left edge with a text label, app name in condensed caps, path in mono, type tags as thermal-printed chips, and a scan-to-confirm copy control. Recent searches print as a pick list in the right gutter; recent additions stack below as putaway tags.

**FORM:** The Location Code — warehouse racking labels, aisle signage, and bin location codes. Candidate 4 of my ordered grounded list; assigned by the roll. Seed key e1908f14, kind assigned, build path code-led.

Raises carried in from the weighed hand, each named for its donor:
- *TDR Info-Noise Sleeve:* density is the material — flat print surfaces, no gradients, content gridded hard to the page edge, no floating cards, and the aisle sign shouting at a scale the web rarely permits.
- *Phosphor Terminal:* the scanner field is a real command line — `/` focuses, arrows walk the type-ahead, Enter commits, Shift+Enter on the highlighted plate copies (plain Enter already owns commit-to-results). State prints as label text in the system's own voice, never as toast chrome.
- *Mesophotic Deep Dive:* two voices only, with one shared vertical rule so every path stacks into a single scannable column.
- *Cyclorama Dawn:* every platform and type band carries a text label and its own shape; colour is never the sole signal.
- *HyperCard Shoebox:* reading and contributing are the same object — each plate carries its own "wrong path / add a variant" affordance in the plate's grammar.
- *Seedbed Lobes:* colour commits at page scale, but never touches the path text, which stays maximum-contrast ink.

**Signature interaction:** scan-to-confirm copy — the plate's copy control inverts the plate to a solid signal-cyan CONFIRMED state with the path still legible in black, then returns. **Motion grammar:** one authored moment, the plate stack racking in on query change (exponential ease-out, staggered, from an already-visible default), and nothing else animates.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved

- GitHub owner/repo for the request link (single placeholder constant).
- Analytics vendor behind the usage-tracking cookie — the consent prompt and privacy page must not name one until decided.
- Whether entries carry contributor attribution or verification dates.
