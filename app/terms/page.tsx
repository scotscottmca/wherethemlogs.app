import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer } from "@/components/Chrome";
import { Consent } from "@/components/Consent";
import { GITHUB_ISSUES, GITHUB_ISSUES_REPO, TERMS_LAST_UPDATED, formatLongDate } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The terms for using Where Them Logs App: what the index is, what it is not, and what happens to what you contribute.",
  alternates: { canonical: "/terms" },
  openGraph: { url: "/terms" },
};

/** The second laminated notice on the aisle wall, next to the privacy one. */
export default function Terms() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="sheet">
        <div className="sheet__inner">
          <div className="sheet__head">
            <h1 className="sheet__h1">
              Terms
              <br />of use
            </h1>
            <p className="sheet__lede">
              This is a free reference index of where applications write their log files.
              Using it means agreeing to the short terms below.
            </p>

            <div className="sheet__rule" role="presentation" />

            <div className="sheet__stamp">
              <span className="tag mono">Terms of use · WTLA-02</span>
              <span className="tag mono">Last updated {formatLongDate(TERMS_LAST_UPDATED)}</span>
            </div>
          </div>

          <div className="sheet__body">
          <h2>The short version</h2>
          <ul>
            <li>The index is free to use, with no account and no payment.</li>
            <li>Every path is a best-effort record, not a guarantee. Check it against your own machine.</li>
            <li>What you submit through the request form becomes public and may be edited or declined.</li>
            <li>Do not flood the site or the API, and do not pass the index off as your own.</li>
          </ul>

          <h2>Who runs this</h2>
          <p>
            Where Them Logs App is run by an individual, not a company, and is provided as a
            public service at no charge. All contact, including questions about these terms,
            goes through the public issue tracker.{" "}
            <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer">
              The issue tracker is here
            <span className="visually-hidden"> (opens in a new tab)</span></a>
            .
          </p>

          <h2>Accuracy</h2>
          <p>
            Log locations change between versions, installer types, architectures and
            individual configurations. Entries are researched and corrected over time, but any
            entry can be out of date or wrong for your setup. Verify a path before you act on
            it, and in particular before you delete, move or share anything it points to. The
            index is provided <strong>as is</strong>, without warranty of any kind, and you use
            it at your own risk. To the fullest extent the law allows, the operator is not
            liable for any loss or damage arising from your use of the site or its data.
          </p>

          <h2>Using the site and the API</h2>
          <p>
            You may read, search and link to the index freely, by browser, by the HTTP API or
            by the MCP endpoint described in the{" "}
            <Link href="/docs">documentation</Link>. Keep automated use reasonable: no
            scraping at a rate that degrades the service, no attempts to probe or bypass
            access controls, and no use that breaks the law. Access may be limited or blocked
            for traffic that does either.
          </p>

          <h2>Contributions</h2>
          <p>
            Requests and corrections are filed as public issues on GitHub, whether you use the
            on-site form or GitHub itself. By submitting one you confirm that the content is
            yours to share and contains nothing confidential, and you grant the operator a
            perpetual, worldwide, royalty-free licence to publish, edit, reformat and
            redistribute it as part of the index. Credit is given where you ask for it, but
            submissions may be edited, merged or declined without notice.
          </p>
          <p>
            The site&rsquo;s source code is published on GitHub under the MIT licence.{" "}
            <a href={GITHUB_ISSUES_REPO} target="_blank" rel="noopener noreferrer">
              The repository is here
            <span className="visually-hidden"> (opens in a new tab)</span></a>
            .
          </p>

          <h2>Third parties</h2>
          <p>
            Application and vendor names and icons belong to their respective owners and
            appear only to identify the software. Nothing on this site is endorsed by or
            affiliated with those vendors. Links to vendor documentation and other external
            sites lead to content the operator does not control.
          </p>

          <h2>Privacy</h2>
          <p>
            What the site stores, and the one optional analytics cookie, are described on the{" "}
            <Link href="/privacy">privacy and cookies page</Link>.
          </p>

          <h2>Changes and law</h2>
          <p>
            These terms may change. The date at the top is updated when they do, and
            continuing to use the site after a change means accepting the new terms. These
            terms are governed by the law of England and Wales.
          </p>

          <p style={{ marginTop: "2.5rem" }}>
            <Link href="/">← Back to the index</Link>
          </p>
          </div>
        </div>
      </main>
      <Footer entryCount={null} />
      <Consent />
    </>
  );
}
