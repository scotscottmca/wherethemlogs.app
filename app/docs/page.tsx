import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer } from "@/components/Chrome";
import { Consent } from "@/components/Consent";
import { GITHUB_ISSUES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How to request an application, flag a wrong path, and pull the catalogue into your own tools over the API or MCP.",
};

/** The other laminated sheet on the aisle wall - this one for the people asking things. */
export default function Docs() {
  return (
    <>
      <Header />
      <main className="sheet">
        <div className="sheet__inner">
          <div className="sheet__head">
            <h1 className="sheet__h1">Docs</h1>
            <p className="sheet__lede">
              How to ask for an application, how to flag a path that is wrong, and how to
              pull the catalogue into a script, a shell, or an agent instead of a browser.
            </p>

            <div className="sheet__rule" role="presentation" />

            <div className="sheet__stamp">
              <span className="tag mono">Docs · WTLA-01</span>
              <span className="tag mono">Last updated 11 September 2026</span>
            </div>

            <nav className="sheet__toc" aria-label="On this page">
              <a href="#requests" className="tag mono">
                Raising a request
              </a>
              <a href="#corrections" className="tag mono">
                Reporting a wrong path
              </a>
              <a href="#api" className="tag mono">
                The API
              </a>
              <a href="#mcp" className="tag mono">
                The MCP server
              </a>
            </nav>
          </div>

          <div className="sheet__body">
            <h2 id="requests">Raising a request</h2>
            <p>
              There is no account and no form to sign into. Every request is a public
              GitHub issue, filed against the tracker rather than the site itself. The{" "}
              <strong>Request an app</strong> link in the header and footer opens a
              prefilled issue for exactly that - add the application&rsquo;s name and it
              becomes the issue title.
            </p>
            <p>
              You can also open the tracker directly and pick a template by hand -
              useful if what you need does not fit &ldquo;add this application&rdquo;, or
              if you want to check whether someone already asked.{" "}
              <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer">
                Browse the issue tracker
              </a>
              .
            </p>
            <p>
              Issues here are public. Do not paste real hostnames, usernames, tenant
              identifiers or customer names into one - describe the application, not the
              machine you found it on.
            </p>

            <h2 id="corrections">Reporting a wrong path, or adding an adjustment</h2>
            <p>
              Every path on a result card carries a{" "}
              <strong>Wrong path? Add a variant</strong> link at the foot of its plate.
              It opens a correction issue prefilled with the application and the
              platform you were looking at, so the report already carries the context a
              maintainer needs - you only have to say what is actually wrong: a stale
              path, a missing installer variant, a scope that needs confirming.
            </p>
            <p>
              An &ldquo;adjustment&rdquo; is the same mechanism as a correction. There is
              no separate channel for small edits versus wrong entries - both go through
              the same issue, and both get triaged the same way.
            </p>

            <h2 id="api">The API</h2>
            <p>
              The catalogue is also a read-only JSON API, anonymous, under{" "}
              <code className="mono">/api</code>. It is the same data the site searches -
              nothing held back, nothing requiring a key.
            </p>

            <table className="sheet__table">
              <thead>
                <tr>
                  <th scope="col">Route</th>
                  <th scope="col">Returns</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono">GET /api/search?q=&amp;platform=&amp;type=&amp;limit=</td>
                  <td>Matching applications, each qualified by platform and installer type</td>
                </tr>
                <tr>
                  <td className="mono">GET /api/summary</td>
                  <td>Catalogue totals and the most recently updated applications</td>
                </tr>
                <tr>
                  <td className="mono">GET /api/vendors</td>
                  <td>Every vendor, by name</td>
                </tr>
                <tr>
                  <td className="mono">GET /api/apps/{"{slug}"}</td>
                  <td>One application, or a 404</td>
                </tr>
              </tbody>
            </table>

            <p>A search, filtered to Windows MSI installs:</p>
            <pre className="sheet__code">
              <code>{`curl "https://wherethemlogs.app/api/search?q=teams&platform=windows&type=msi"`}</code>
            </pre>
            <p>
              Paths come back exactly as stored - environment variables such as{" "}
              <code className="mono">%LOCALAPPDATA%</code> and{" "}
              <code className="mono">$XDG_STATE_HOME</code> are never expanded, and a
              label carrying several files is a <code className="mono">paths</code>{" "}
              array rather than one string. Read responses send{" "}
              <code className="mono">cache-control: public, max-age=60</code>, so a
              script polling this on a schedule can cache it for a minute without
              missing anything real.
            </p>
            <p>
              A failure is always the same shape -{" "}
              <code className="mono">{`{ "error": "...", "message": "..." }`}</code> -
              with a status of <code className="mono">400</code> for a bad query and{" "}
              <code className="mono">404</code> for a slug that does not exist. There is
              no rate limit beyond ordinary abuse protection; there is also no bulk
              export endpoint for anonymous callers; a search with no{" "}
              <code className="mono">q</code> returns the whole catalogue, alphabetically.
            </p>
            <p>
              Curation - adding vendors, applications and log paths - is a separate,
              signed-in admin API. It is not covered here because it is not something a
              visitor calls; requests and corrections both go through the issue tracker
              above instead.
            </p>

            <h2 id="mcp">The MCP server</h2>
            <p>
              The same catalogue is available as an{" "}
              <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">
                MCP
              </a>{" "}
              server at <code className="mono">/api/mcp</code>, for agents rather than
              browsers. It speaks Streamable HTTP and is stateless - every call stands
              alone, there is no session to open first, and a response is plain JSON
              rather than an event stream.
            </p>

            <table className="sheet__table">
              <thead>
                <tr>
                  <th scope="col">Tool</th>
                  <th scope="col">Arguments</th>
                  <th scope="col">Returns</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono">search_log_locations</td>
                  <td className="mono">query, platform?, limit?</td>
                  <td>Matching applications, each with its log paths by platform</td>
                </tr>
                <tr>
                  <td className="mono">get_app_log_locations</td>
                  <td className="mono">slug</td>
                  <td>One application&rsquo;s log paths</td>
                </tr>
              </tbody>
            </table>

            <p>Point a client at it:</p>
            <pre className="sheet__code">
              <code>{`claude mcp add --transport http wherethemlogs https://wherethemlogs.app/api/mcp`}</code>
            </pre>
            <p>Or call a tool directly, without a client:</p>
            <pre className="sheet__code">
              <code>{`curl https://wherethemlogs.app/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_log_locations","arguments":{"query":"teams"}}}'`}</code>
            </pre>
            <p>
              Results leave out ids, icons and timestamps to keep an agent&rsquo;s
              context small, and search matches names and aliases the same way{" "}
              <code className="mono">/api/search</code> does. Requests over 64 KB get a{" "}
              <code className="mono">413</code>; <code className="mono">GET</code> and{" "}
              <code className="mono">DELETE</code> get the standard{" "}
              <code className="mono">405</code>, since there is no session to fetch or
              close.
            </p>

            <p style={{ marginTop: "2.5rem" }}>
              <Link href="/">&larr; Back to the index</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer entryCount={null} />
      <Consent />
    </>
  );
}
