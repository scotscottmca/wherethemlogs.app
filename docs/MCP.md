# The MCP server

The catalogue as an [MCP](https://modelcontextprotocol.io) server: where any
application writes its log files on Windows, macOS and Linux, for an agent
rather than a browser. Read-only, anonymous, no sign-up and no key.

```
https://wherethemlogs.app/api/mcp
```

Streamable HTTP, stateless. Every request stands alone - there are no sessions,
responses are plain JSON rather than an event stream, and `GET` and `DELETE`
return `405` because there is no session to resume or end.

## Connecting

```powershell
claude mcp add --transport http wherethemlogs https://wherethemlogs.app/api/mcp
```

Any client that takes a remote server by URL:

```json
{
  "mcpServers": {
    "wherethemlogs": {
      "type": "http",
      "url": "https://wherethemlogs.app/api/mcp"
    }
  }
}
```

Straight over HTTP, to check it answers:

```powershell
Invoke-RestMethod https://wherethemlogs.app/api/mcp -Method Post -ContentType application/json `
  -Headers @{ Accept = 'application/json, text/event-stream' } `
  -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Tools

| Tool | Arguments | Returns |
| --- | --- | --- |
| `search_log_locations` | `query` (app name or alias, max 120 chars), `platform?` (`windows`, `macos`, `linux`), `limit?` (1-25, default 10) | Matching apps, each with its log paths |
| `get_app_log_locations` | `slug` (as returned by a search) | One app's log paths, or an error result naming the slug |

Search matches application names and aliases, not vendor names: `teams`,
`zoom`, `docker`. Both tools are annotated `readOnlyHint`.

A result, trimmed of everything an agent pays tokens for and cannot use - ids,
icons, timestamps:

```json
{
  "app": "Microsoft Teams",
  "slug": "microsoft-teams",
  "vendor": "Microsoft Corporation",
  "logs": [
    {
      "platform": "windows",
      "what": "new Teams (v2)",
      "paths": ["%LOCALAPPDATA%\\Packages\\MSTeams_8wekyb3d8bbwe\\LocalCache\\Microsoft\\MSTeams\\Logs\\"]
    },
    {
      "platform": "windows",
      "what": "classic (retired)",
      "paths": ["%APPDATA%\\Microsoft\\Teams\\logs.txt"]
    },
    {
      "platform": "macos",
      "what": "new Teams (v2)",
      "paths": ["~/Library/Group Containers/UBF8T346G9.com.microsoft.teams/Library/Application Support/Microsoft/Teams/Logs/"]
    }
  ]
}
```

`scope`, `variant`, `note`, `documentation` and `notes` appear on the records
that have them and are left out of the ones that do not - the example above is
Teams, abridged to three of its five entries.

Two things to know about a path before quoting one:

- **It is verbatim.** `%LOCALAPPDATA%`, `~` and `$XDG_STATE_HOME` are never
  expanded. Expand them against the machine you are actually looking at.
- **One `what` can carry several files**, which is why `paths` is a list.

A tool's failure is its answer: an unknown slug or an unreachable catalogue
comes back as an `isError` result naming the problem, not a transport error.

## Limits

- Request bodies over 64 KB get `413`.
- Reads are served from an in-process snapshot of the catalogue with a 60
  second TTL, so an edit made in the admin portal shows up within a minute.
- No authentication, no rate limit, no quota. Be reasonable; the whole
  catalogue is a few hundred kilobytes and `search_log_locations` with an
  empty-ish query will hand you most of it.

## What is in it

542 applications from 372 vendors, 847 verified log locations, as of
September 2026. Every path is checked against a real installation or vendor
documentation before it lands, and each one is qualified by platform,
installer type (msi, exe, msix, pkg, dmg, deb, rpm, snap, flatpak, appimage),
architecture, and where it sits relative to the user (`per-user`,
`per-machine`, `system`).

A wrong or missing path is a [public issue](https://github.com/scotscottmca/wherethemlogs.app-issues/issues) -
no account with this site needed.

The same data is on the [HTTP API](API.md) if a JSON endpoint suits better
than a tool call.

## Listing this server in a registry

The repository root has a `server.json` describing the remote endpoint, ready
for the official registry's publisher:

```powershell
mcp-publisher login dns --domain=wherethemlogs.app --private-key=<hex key>
mcp-publisher publish
```

The `app.wherethemlogs/*` namespace is claimed by proving ownership of
wherethemlogs.app with a DNS TXT record on the zone - the same Cloudflare zone
that already fronts the site. Bump `version` in `server.json` whenever the
tools change; the registry keys releases on it.
