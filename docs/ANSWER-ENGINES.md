# Answer engines

ChatGPT, Perplexity and Google's AI Overviews answer "where does Slack keep its
logs on Windows" without anybody clicking a result. A page of exactly that
answer either gets quoted and cited, or gets synthesised around. This is what
the site does about it, and how to tell whether it is working.

## Crawler access

`app/robots.ts` serves one `User-Agent: *` group that allows everything except
`/admin`, `/api/` and `/403`. There is no AI-specific group and no opt-out
token, deliberately: every answer engine's crawler is welcome on every public
page.

The crawlers this covers, by the user agent they send:

| Engine | Crawlers |
| --- | --- |
| OpenAI | `GPTBot` (training), `OAI-SearchBot` (search index), `ChatGPT-User` (a user's live request) |
| Perplexity | `PerplexityBot`, `Perplexity-User` |
| Anthropic | `ClaudeBot`, `Claude-User`, `Claude-SearchBot` |
| Google | `Google-Extended` (a token, not a crawler - Googlebot does the fetching) |
| Microsoft | `Bingbot` feeds Copilot; there is no separate agent |

robots.txt is only half the question. Cloudflare sits in front of the site and
its bot controls can block AI crawlers at the edge regardless of what
robots.txt says, so the policy has to be checked over the wire, not read off
the file:

```powershell
'GPTBot/1.1','PerplexityBot/1.0','ClaudeBot/1.0','Google-Extended' | ForEach-Object {
  $code = (Invoke-WebRequest https://wherethemlogs.app/ -UserAgent "Mozilla/5.0 (compatible; $_)").StatusCode
  "$_ $code"
}
```

All four returned `200` on 12 September 2026. Re-run it after any change to the
Cloudflare zone's bot settings - "Block AI bots" and AI Labyrinth are both
one-click features that would silently undo this.

## What the pages give them

- Each `/apps/{slug}` page leads with one self-contained sentence per platform
  ("Slack logs to `%APPDATA%\Slack\logs\browser.log` on Windows."), generated
  by `platformSummaries()` in `lib/api.ts`. A sentence can be lifted verbatim;
  a table row has to be inferred.
- The same sentences are repeated as `FAQPage` question/answer pairs in the
  page's JSON-LD (`lib/jsonld.ts`), which is the most machine-readable form of
  the same fact.
- Paths are printed verbatim, unexpanded, so a quoted answer stays correct
  wherever it lands.

## Tracking citation

There is no Search Console for answer engines. The substitute is a spot check,
run by hand once a quarter, against a fixed set of queries so the results are
comparable over time:

1. Where does Slack store its log files on Windows?
2. Where are Microsoft Teams logs on macOS?
3. Where does Docker Desktop write its logs?
4. Where does 1Password keep its logs on Mac?
5. Where are Adobe Acrobat log files stored?
6. Where does the Splunk Universal Forwarder log on Linux?

Ask each in ChatGPT (with search on), Perplexity, and Google (looking for an AI
Overview). For each, record the date, the engine, whether wherethemlogs.app was
cited, and whether the answer given was right. Add the numbers as a comment on
the tracking issue rather than a file in this repository - it is a reading,
not a document.

A run where the answer is correct but uncited is the interesting case: the
content is being used and the link is not. A run where the answer is wrong and
the catalogue has the right path is the other one - that page is not being
reached at all, and the crawler check above is the first thing to re-run.
