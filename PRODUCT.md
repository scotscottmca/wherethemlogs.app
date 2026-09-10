# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Node.js / React (full framework app). Confirmed by the user: server-side search, an admin UI for catalogue curation, and a database back the site. Not a static site and not a client-side JSON catalogue - both were offered and declined.

## Users

Primary: IT administrators and endpoint administrators troubleshooting a specific application on a specific machine, usually mid-incident. They are at a terminal or a remote session, need one exact path, and need to know whether that path is the right one for the OS and installer flavour in front of them.

Also primary: application packagers, who need log paths while building or validating deployment packages and detection rules, and who care about per-installer-type differences (MSI vs EXE, x86 vs x64, per-user vs per-machine).

Secondary: technically literate enthusiasts and power users chasing a misbehaving app on their own machine.

The shared situation: the user already knows the app name. They do not want to read a page. They want to type a name and get a path they can copy.

## Product Purpose

Where Them Logs App is a searchable repository of log file locations for popular applications across Windows, macOS and Linux. Success is a user typing an app name and leaving with the correct, copyable path in seconds - with no scrolling, no cookie wall in the way, and no article wrapped around the answer.

## Positioning

The answer to "where does this app write its logs" is currently scattered across vendor docs, Stack Overflow threads, and forum posts of unknown vintage. This product's mechanism is that the answer is the whole product: one catalogue, one search field, paths normalised into a consistent shape and qualified by platform and installer type, so the same lookup works for every app.

The differentiator a neighbouring product could not truthfully copy: paths are qualified by **installer type and architecture** (MSI, EXE, x86, x64), not just by OS. That distinction is what packagers actually need and what general search results do not give them.

## Operating Context

- Lookups happen mid-task: during an incident, a support call, or a packaging run. Speed to the first result outranks everything else on the page.
- The output is destined for a terminal, a script, a ticket, or a remote session - so paths must be copyable exactly, and environment variables (`%LOCALAPPDATA%`, `~/Library/Logs`, `$XDG_STATE_HOME`) must survive verbatim rather than being expanded into one machine's reality.
- Users often work across several platforms in one sitting; platform is a filter, not a separate site.
- The audience is technical and reads path syntax fluently. It does not need paths explained; it needs them exact.

## Capabilities and Constraints

**Confirmed capabilities**

- Home: single page - header with logo, search bar, recent searches, recent additions.
- Platform filter: Windows / macOS / Linux, default All, present on home and results.
- Search: type-ahead showing the most likely correct result live; Enter commits to a full results page.
- Results page: all matches for the query, filterable by platform and by type (MSI, EXE, x86, x64, and comparable flavours).
- Privacy page: standard privacy and cookie disclosure.
- Cookie consent prompt covering usage-tracking cookies.
- "Request an app" button linking to GitHub Issues.

**Confirmed constraints**

- Server-side search against a database; admin UI for curation (both out of scope for the mockup stage, in scope for the product).
- Recent searches are the visitor's own recent searches - a local convenience, and its storage must be consistent with whatever the cookie prompt and privacy page state.

**Undecided / not yet supplied**

- GitHub owner/repo. The request link and any repo references use a single clearly-marked placeholder the user swaps in one place.
- Which analytics product backs the usage-tracking cookie. The consent prompt and privacy page must not name a vendor until this is decided.
- Whether entries carry contributor attribution, verification dates, or app version scoping.

## Brand Commitments

- Name: **Where Them Logs App**. Confirmed and binding.
- No logo, wordmark, colour, or typeface has been supplied. Identity is open.

## Evidence on Hand

None supplied. There is no existing catalogue, no dataset, no logo, no screenshots, no traffic figures, no user research.

Consequences for all future work: catalogue entries shown in mockups are **seed data** - real, verifiable log paths, labelled as seed. No entry counts, contributor counts, usage statistics, uptime claims, endorsements, or "trusted by" material may be invented, because none exist.

## Product Principles

1. **The path is the product.** Everything on screen is judged by how fast it delivers a correct, copyable path. Anything that delays that is decoration.
2. **Qualify, don't generalise.** A path without its platform, installer type, and architecture is a guess. The qualifiers travel with the path everywhere it appears.
3. **Exactness over friendliness.** This audience reads path syntax natively. Preserve environment variables and casing verbatim; never prettify a path into inaccuracy.
4. **Earn the trust of people who have been burned by stale forum answers.** Where a claim's provenance matters, show it or say it is unknown - never imply certainty the catalogue does not have.
5. **Respect the visitor's data as the audience would.** This audience reads privacy policies. The cookie prompt gives a real, equally-weighted decline, and the privacy page says plainly what is collected.

## Accessibility & Inclusion

No product-specific requirement was established beyond standard practice. Note the operating context: lookups happen under time pressure, often over remote sessions with degraded rendering, so keyboard-first operation of search and filters and legible path typography at small sizes are functional requirements, not niceties.
