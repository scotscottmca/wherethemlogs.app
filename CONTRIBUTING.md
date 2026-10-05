# Contributing to Where Them Logs App

Most contributions here are data: an application missing from
**[Where Them Logs App](https://wherethemlogs.app)**, or a path in it that is
wrong. Both are issues on this repository. The quickest way in is the site's
own [request form](https://wherethemlogs.app/request), which files the issue
for you and needs no GitHub account; the GitHub forms below do the same job.

## What you can open

| | |
| --- | --- |
| **[Add an application](https://github.com/scotscottmca/wherethemlogs.app/issues/new?template=add-application.yml)** | An app is missing from the index |
| **[Correct a path](https://github.com/scotscottmca/wherethemlogs.app/issues/new?template=correct-a-path.yml)** | A path is wrong, stale, or missing a variant |
| **[Something else](https://github.com/scotscottmca/wherethemlogs.app/issues/new?template=something-else.yml)** | A bug on the site, or anything the other two do not fit |

## What makes a good entry

The index is only worth using if the paths in it are exact. Two things matter
more than anything else:

**Paste the path verbatim.** Environment variables stay unexpanded -
`%LOCALAPPDATA%`, `~/Library/Logs`, `$XDG_STATE_HOME`. Do not substitute your own
username, drive letter, or profile directory. The machine someone else is fixing
is not yours.

**Say how you know.** "It's on my machine" is a fine answer. So is a link to
vendor documentation. What is not useful is a path copied from a forum post of
unknown vintage - that is the problem this index exists to solve.

## How entries are shaped

The catalogue is `Vendor > App > Log path`. One vendor has many apps; one app has
many log paths, and each path is qualified by:

- **Platform** - Windows, macOS or Linux
- **Installer type** - msi, exe, msix, appx, pkg, dmg, mas, deb, rpm, snap, flatpak, appimage
- **Architecture** - x86, x64, arm64
- **Scope** - per-user, per-machine, system
- **Variant** - for apps that ship in more than one flavour, e.g. "Classic (v1)"

That last set is the reason this index exists rather than a search engine: the
same application writes to different places depending on how it was deployed,
and a path without those qualifiers is a guess.

You do not have to fill all of it in. Give what you know and say what you are
unsure about - a partial entry with an honest gap is more use than a confident
wrong one.

## Privacy

Issues here are **public**, and so is this repository. Do not paste real
hostnames, usernames, tenant identifiers, customer names, or anything else from a
production environment. Redact them - `C:\Users\<username>\...` is exactly as
useful to us as the real thing.

## What happens next

Entries are reviewed and added by hand. There is no SLA on that; this is a
reference people maintain because they needed it themselves.

If an entry is declined it will be for one of three reasons, and the issue will
say which: the path could not be verified, the application does not write logs to
a stable location, or the request was for something the index is not (it is a
location index, not a log-parsing guide).

## Code

Changes to the site itself are welcome as pull requests. `CLAUDE.md` and
`docs/` describe how it is built; `npm run typecheck` and `npm run build` are
what CI runs.
