import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer } from "@/components/Chrome";
import { Consent, ConsentReset } from "@/components/Consent";
import { GITHUB_ISSUES, PRIVACY_LAST_UPDATED, formatLongDate } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy & cookies",
  description:
    "What Where Them Logs App stores, what it does not, and how to decline the analytics cookie.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy" },
};

/** The laminated notice on the aisle wall: black ink on label stock. */
export default function Privacy() {
  return (
    <>
      <Header />
      <main className="sheet">
        <div className="sheet__inner">
          <div className="sheet__head">
            <h1 className="sheet__h1">
              Privacy
              <br />&amp; cookies
            </h1>
            <p className="sheet__lede">
              You came here to find a file path. That should not cost you a profile. This
              page says exactly what is stored, where it lives, and how to switch the one
              optional thing off.
            </p>

            <div className="sheet__rule" role="presentation" />

            <div className="sheet__stamp">
              <span className="tag mono">Privacy notice · WTLA-01</span>
              <span className="tag mono">Last updated {formatLongDate(PRIVACY_LAST_UPDATED)}</span>
            </div>
          </div>

          <div className="sheet__body">
          <h2>The short version</h2>
          <ul>
            <li>No account, no sign-in, no advertising, and nothing sold.</li>
            <li>
              Optional Google Analytics cookies, set only if you press <strong>Accept</strong>.
              Decline and Google is never loaded, and the site behaves identically - no
              reduced features, no repeated asking on every page.
            </li>
            <li>
              Your recent searches are stored in your own browser and never sent to us.
            </li>
            <li>
              Nothing about the machine you are troubleshooting is collected. We never see
              your file paths, your hostnames, your usernames, or your environment.
            </li>
          </ul>

          <h2>What gets stored</h2>
          <table className="sheet__table">
            <thead>
              <tr>
                <th scope="col">What</th>
                <th scope="col">Where</th>
                <th scope="col">Why</th>
                <th scope="col">How long</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Consent choice</td>
                <td>Your browser (local storage)</td>
                <td>So we stop asking</td>
                <td>Until you clear site data</td>
              </tr>
              <tr>
                <td>Recent searches</td>
                <td>Your browser (local storage)</td>
                <td>The recent searches list on the index page</td>
                <td>Last 8, until you clear them</td>
              </tr>
              <tr>
                <td>Analytics cookies (<span className="mono">_ga</span>, <span className="mono">_ga_CG11KY5XE3</span>)</td>
                <td>Your browser, read by Google Analytics</td>
                <td>Counting which applications get looked up</td>
                <td>Set only on Accept, for up to 2 years</td>
              </tr>
              <tr>
                <td>What you write in a request form</td>
                <td>A public GitHub issue, filed by the site</td>
                <td>Adding or correcting an entry</td>
                <td>As long as the issue exists</td>
              </tr>
              <tr>
                <td>Server request logs</td>
                <td>Our hosting provider</td>
                <td>Security, abuse and error investigation</td>
                <td>Short-lived, then discarded</td>
              </tr>
            </tbody>
          </table>

          <h2>Google Analytics</h2>
          <p>
            If you accept, the site loads Google Analytics 4. It sets two first-party cookies
            and sends Google the pages you view - the address includes the search term and
            platform filter - along with your browser type, screen size and approximate
            location. We use it to see which applications people look up, so the catalogue
            gets filled in the order people actually need.
          </p>
          <p>
            Google Analytics 4 does not log or store IP addresses. Google signals and ad
            personalisation are switched off for this site, so the data is not used for
            advertising or linked to a Google account. Google may process it outside your
            country, including in the United States.{" "}
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
              How Google uses this data
            </a>
            .
          </p>
          <p>
            Decline, or never answer, and the Google script is not loaded at all - nothing
            is sent to Google.
          </p>

          <h2>Recent searches are not a cookie</h2>
          <p>
            The recent searches list on the index page is written to your browser&rsquo;s local storage.
            It is readable only by this site, on this device, and it is never transmitted.
            Clearing it is one button on the index page, or clearing site data in your
            browser. If your browser blocks storage, the list simply stays empty and nothing
            else changes.
          </p>

          <h2>Changing your mind</h2>
          <p>
            This button forgets your answer, deletes the Google Analytics cookies and asks
            again. Clearing this site&rsquo;s data in your browser does the same. Declining is
            remembered the same way accepting is - we do not treat a decline as an invitation
            to ask again tomorrow.
          </p>
          <p>
            <ConsentReset />
          </p>

          <h2>Contributions</h2>
          <p>
            Corrections and new entries are handled as public issues on GitHub. The{" "}
            <Link href="/request">request form</Link> files the issue for you, so you need no
            GitHub account: everything you type into it, including the optional GitHub
            username, LinkedIn profile and X or Bluesky handle you add for credit, is published
            on that issue. Do not paste real hostnames, usernames, tenant identifiers or
            customer names into it. Filing on GitHub yourself works too, under GitHub&rsquo;s
            own privacy terms.{" "}
            <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer">
              The issue tracker is here
            </a>
            .
          </p>
          <p>
            The request form is protected by Cloudflare Turnstile, which checks that a person
            is sending it. It runs only on the request pages. Turnstile reads signals from your
            browser to tell people from bots and, per Cloudflare, does not use them for
            advertising or to track you across sites.{" "}
            <a href="https://www.cloudflare.com/turnstile-privacy-policy/" target="_blank" rel="noopener noreferrer">
              Cloudflare&rsquo;s Turnstile privacy addendum
            </a>
            .
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this notice, or a request to remove something, go to the issue
            tracker above. If a matter should not be public, say so in the issue and a private
            channel will be arranged.
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
