---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/search/page.tsx","app/privacy/page.tsx"]
---

## Scope

The Where Them Logs App front end: home (`app/page.tsx`), search results (`app/search/page.tsx`), privacy (`app/privacy/page.tsx`), plus the cookie consent prompt and the shared chrome. Visitor mode: **Operate** - the visitor came to retrieve one exact path, usually mid-incident.

## Audience and job

IT and endpoint administrators, application packagers, technical enthusiasts. They already know the app name. The job is: type it, get the correct path, copy it, leave. Packagers additionally need the path qualified by installer type and architecture (MSI / EXE / x86 / x64), which is the product's differentiator.

## Task and constraints

- Home is single-screen: header, search field, platform filter (Windows / macOS / Linux, default All), recent additions, the visitor's recent searches.
- Type-ahead lists the matches as rows, each showing its first path and linking to its app page; Enter commits to `/search`, which lists all matches, filterable by platform and by type.
- Privacy page; cookie consent prompt for usage tracking with a genuine, equally-weighted decline.
- "Request an app" links to GitHub Issues - repo URL is an unresolved placeholder in one constant.
- Catalogue entries are labelled **seed data**: real, verifiable paths, no invented entry counts, contributor counts, or usage statistics.
- Paths preserve environment variables (`%LOCALAPPDATA%`, `~/Library/Logs`, `$XDG_STATE_HOME`) verbatim; never expanded.

## Direction contract

**THESIS:** A log path is a folder location, so the site is a folder you look things up in. One search field does the work and the answer appears under it. It refuses the look-alike of a general search engine (big centred logo over a pill box) and refuses the stencilled warehouse wall it replaces.

**OWN-WORLD:** Calm ground, deep navy (#131520) in dark and pale cool grey (#f6f6fa) in light, both following the visitor's device. One manila tab colour (#f4c95d dark, #ffd978 light) for every fill the visitor acts on, always carrying dark brown text. Bricolage Grotesque for words, Spline Sans Mono for paths, tags and keys. Soft 10px corners, hairline borders, one soft shadow for the floating suggestions. No uppercase labels, no condensed type.

**STORY:** The visitor sees a path-shaped name and a field that looks like a folder tab, types an app name, and reads the path under the field with a copy button beside it. They copy and leave, or open the app page for every platform.

**FIRST VIEWPORT:** Slim header: mark and name left, links right. One left-aligned column: the name drawn as a path, where/them/logs/, at display size with the slashes in the accent; one line of grey text under it; the manila search field with a small "Find an app" tab standing up from its top left corner and a dark Search button inside; a one-line keyboard hint (the "/" shortcut and its off switch, which accessibility rules require); the platform filter as four small links with counts; one row of recently added apps; the visitor's own recent searches when there are any; two short grey paragraphs that say what the site is and how to request an app.

**FORM:** The Folder - manila folder tabs and a folder tree. seed: none (pinned). The user asked for a wild card ("design something totally new with your own choices"), so the world was the builder's choice with no roll. It was shown as a working HTML mockup and the user then picked it by name ("The wild card"). The mockup was a private published page and is not kept in the repository.

**Signature interaction:** on an app page each platform's paths are merged into one folder tree: the folders they share print once and each file hangs under them as a manila leaf with its own copy button, which still copies the whole stored path. **Motion grammar:** result cards rise and fade in once on load, briefly staggered; nothing else animates.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved

- GitHub owner/repo for the request link (single placeholder constant).
- Whether entries carry contributor attribution or verification dates.

**COPY (2026-09-11):** Interface text is plain, at the user's request - Catalogue, Add, Delete, Platform filter, Search for an app, log locations tracked. Older warehouse terms survive only in class names.
