---
name: discover-apps
description: Research popular desktop apps not yet in the wherethemlogs.app catalog, verify their log file locations and vendors via web search, and produce a reviewable import JSON. Use when the user asks to find more apps for the catalog, discover untracked apps, or grow the app list across Windows/macOS/Linux.
---

# Discover untracked apps

Find genuinely popular desktop apps that aren't in the wherethemlogs.app catalog yet, verify each one has a real documented log location, and build an import-ready JSON the user can paste into the admin import screen (`/admin/import`) themselves. This skill never writes to the live site directly - there is no local database, and imports only happen through the admin UI, by the user, on purpose (see `CLAUDE.md`).

Default scope if the user doesn't specify one: roughly 100 apps combined across all three platforms, however the real candidates land (don't force an even split, don't pad with weak candidates to hit the number). If the user asks for a different count or a single platform, honor that instead.

## Step 1 - Work out what's already tracked

Sources (a) and (b) are both required. Getting this wrong means proposing duplicates.

**(a) The live public catalog**, via `curl`:
```bash
curl -s "https://wherethemlogs.app/api/search"
```
Returns `{count, matched, results}`. **`count` can be less than `matched`** - an app whose `logPaths` array is empty (just an app-level note like "no logging by default") is silently omitted from `results` even though the record exists. For any candidate name you're not fully sure about, also check directly:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://wherethemlogs.app/api/apps/<slug>"
```
`200` = already exists, `404` = free. Derive `<slug>` the same way `lib/model.ts`'s `slugify()` does: lowercase, non-alphanumerics collapsed to single hyphens, trim leading/trailing hyphens.

**(b) This repo's own working tree**, if the user has other uncommitted research files lying around (`scripts/log-research/`, per `CLAUDE.md`) or past `discovered-apps` JSON files - skim them so you don't re-propose something already sitting there unapplied.

**(c) `scripts/log-research/blocked-sources.md`**, if it exists - the running list of sites past passes could not read (captcha, bot check, hard paywall). Pass it to the agents in step 2 so they stop burning search budget on the same walls.

Build the full exclusion list before researching, not while researching.

## Step 2 - Research, in parallel

Spawn one background `Agent` (subagent_type: general-purpose) per platform - Windows, macOS, Linux - each given:
- The full exclusion list from step 1.
- The target count for that platform (roughly a third of the total, adjusted for how the last run distributed if this is a repeat pass).
- The **strict rule**: only include an app if you found a genuine, documented, on-disk log file/directory, or (for Linux) a specific `journalctl -u <real-unit-name>` - verified via an actual web search (official docs, GitHub, man pages, well-known sysadmin/support articles), not training-data memory alone. Skip anything whose only "log" is a live debug console with no persistent file. If an app turns out not to persist logs anywhere, drop it rather than force it in.
- Instruction to prioritize genuinely popular, well-known software people would actually search for.
- Instruction to note the source URL for each path found, for step 3's `documentation` field.
- Instruction to record, for every path, **whose data it is**: per-user (the literal path sits under one user's profile), per-machine (a shared, install-wide location), system (a log the OS itself owns, e.g. Windows event logs, `journalctl`, `/var/log/syslog`), or unknown. Unknown is a valid and common answer - say it rather than reasoning from the app's category.
- Instruction to record whether a path is tied to a particular **build**: an architecture (a 32-bit install logging somewhere the 64-bit build does not) or an installer flavour (msi/exe/msix/appx, pkg/dmg/mas, deb/rpm/snap/flatpak/appimage). Only when a source actually distinguishes them. Most apps log to the same place whatever the build, so the usual answer is "not build-specific".
- Instruction to record any source that **could not be read** - captcha, Cloudflare/bot interstitial, 403 to the fetcher, login or paywall wall - as `<domain> - <what blocked it> - <what was being looked up>`, and to move on to another source rather than retrying. This is reported back separately from the app findings.
- The output format: one heading per app, a bullet per platform with the path in backticks and a short parenthetical note only when something needs enabling/flagging.

This mirrors how this catalog's manual research batches have been built so far - see the conversation history in this project if you want the exact prompt template used previously.

## Step 3 - Build the import JSON

Read `docs/API.md`'s "Import and export" section for the exact schema (`vendors` > `apps` > `logs`, keys `os`/`path`/`what`/`note`/`variant`/`scope`/`types`, `os` is `windows`|`macos`|`linux`|`all`).

Conventions established over several manual batches - follow these, they're not optional style choices:

- **No confirmed company behind an open-source/indie tool** → use the project's own name as the vendor (matches existing entries like Greenshot, Homebrew, systemd) rather than guessing a company name.
- **Verify any vendor/company name you're not already fully confident about** with a web search before writing it in - especially corporate ownership (acquisitions, rebrands). A wrong guess is worse than the safe self-named fallback above. This has caught real cases: TunnelBear was acquired by McAfee, RStudio renamed to Posit, Easy Anti-Cheat was acquired by Epic Games, Puppet was acquired by Perforce, Datto was acquired by Kaseya - none of that is guessable from a product name alone.
- **A combined/paired name in a source list that's really two different-vendor products** (two competing apps, or a fork with a different maintaining org - e.g. "Rectangle / Magnet", "Ice / Bartender", "MySQL / MariaDB") → split into two separate app entries under their own vendors, even if they'd share a near-identical log path. A combined name that's genuinely one tightly-coupled tool under one vendor (APT/dpkg, DNF/YUM - already single apps in the live catalog) stays one app.
- **Reuse the exact vendor name/casing already in the live catalog** (`GET /api/vendors`) when a vendor you're adding already exists there, rather than writing a slightly different variant of the same company name.
- **Every "already exists" verdict from step 1 needs a path-level diff, not just a name match.** If an app is already tracked but the source material has a log path the live record doesn't have, that's a merge into the existing app (fetch its current `logPaths`, include them all plus the new one - `logs` replaces the whole list on import), not a duplicate app and not a silent drop. Call this out separately to the user rather than folding it into the "new apps" JSON.
- **`scope` is best effort, and blank on any doubt.** Judge the literal path first: `%LOCALAPPDATA%`, `%APPDATA%`, `%USERPROFILE%`, `~/Library`, `$HOME`, `$XDG_*` are `per-user`; `%ProgramData%`, `%ProgramFiles%`, `%WinDir%`, `/Library`, `/var/log`, `/opt`, `/etc` are `per-machine`; a log the OS owns rather than the app (Windows event logs, `journalctl -u ...`, syslog) is `system`. If the path does not settle it and no source confirms it, omit `scope` entirely - the field is optional precisely so "nobody has confirmed this" is recordable. Never infer it from the app being a service, a driver or an enterprise product.
- **`types` is where architecture and installer flavour go, and it is usually empty.** Set it only when the path is genuinely specific to that build: `x86` when a 32-bit install logs under `C:\Program Files (x86)\...` and the 64-bit one does not, `mas` for a sandboxed `~/Library/Containers/...` path when the direct download writes to `~/Library/Application Support/...`, `snap` or `flatpak` for `~/snap/...` or `~/.var/app/...`. A path that serves every build gets `[]`. Two real paths for two real builds is what `types` is for; one path plus a hunch is not.

- **Set each app's `documentation` field** to the single best URL for the vendor's own page about where that app's logs live - an official docs/support/help page, not a third-party blog, forum post, or the page you personally read the fact from if that page isn't the vendor's own. Only set it when you're confident it's the vendor's own domain and it's genuinely about the app's logs, not just a marketing homepage. Leave it out entirely rather than guess. It must be `https` - `httpsUrl` in `lib/server/validate.ts` rejects an `http://` URL and fails the whole import, so try the `https` form of the page and drop the field if the vendor only serves it over `http`.

Validate the JSON before delivering it:
```bash
node -e "JSON.parse(require('fs').readFileSync('FILE.json','utf8'))"
```

## Step 4 - Deliver it

Write the file to `scripts/log-research/discovered/<UTC-timestamp>.json` in the working tree (matching the `{"vendors": [...]}` shape from `docs/API.md`) - this directory already holds the owner's own uncommitted research files per `CLAUDE.md`, so this is consistent with existing repo conventions. **Do not `git add`, commit, or push it** - that's a separate action the user can ask for explicitly if they want a PR or commit.

Append any blocked sources the agents reported to `scripts/log-research/blocked-sources.md` (create it if absent), one line each:

```
- <domain> - <what blocked it> - <UTC date> - <what was being looked up>
```

One line per domain per pass; if the domain is already listed, add the date to that line rather than a second entry. Same rule as the JSON: do not `git add` or commit it.

Send the file to the user directly (`SendUserFile`) so they can review it or paste it into `/admin/import` (preview first - import without `?apply=true` - before applying, per `docs/API.md`).

In your reply, summarize: total app count and rough platform breakdown, any vendor names used as a safe self-named fallback rather than a verified company (flag for a human glance), any app skipped a `documentation` link for and why, how many paths were left without a `scope` because it could not be confidently determined, any "already tracked but found new info" cases from step 3, and any sites that blocked the research (with whether a fact was lost or found elsewhere).
