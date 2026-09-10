import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer } from "@/components/Chrome";
import { Consent } from "@/components/Consent";
import { GITHUB_ISSUES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy & cookies",
  description:
    "What Where Them Logs App stores, what it does not, and how to decline the analytics cookie.",
};

/** The laminated notice on the aisle wall: black ink on label stock. */
export default function Privacy() {
  return (
    <>
      <Header />
      <main className="sheet">
        <div className="hazard" role="presentation" />
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
              <span className="tag mono">Notice WTLA-PR-01 · Seed build</span>
              <span className="tag mono">Catalogue: demonstration data</span>
            </div>
          </div>

          <div className="sheet__body">
          <h2>The short version</h2>
          <ul>
            <li>No account, no sign-in, no advertising, and nothing sold or shared.</li>
            <li>
              One optional analytics cookie, set only if you press <strong>Accept</strong>.
              Decline and the site behaves identically — no reduced features, no repeated
              asking on every page.
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
                <td>The pick list on the index page</td>
                <td>Last 8, until you clear them</td>
              </tr>
              <tr>
                <td>Analytics cookie</td>
                <td>First-party cookie</td>
                <td>Counting which applications get looked up</td>
                <td>Set only on Accept</td>
              </tr>
              <tr>
                <td>Server request logs</td>
                <td>Our hosting provider</td>
                <td>Security, abuse and error investigation</td>
                <td>Short-lived, then discarded</td>
              </tr>
            </tbody>
          </table>

          <h2>The analytics cookie</h2>
          <p>
            If you accept, one first-party cookie records which search terms and platform
            filters are used, so the catalogue gets filled in the order people actually need.
            It records the search term and the zone filter. It does not record your IP address
            in full, does not follow you to other sites, and is not shared with an advertising
            network.
          </p>
          <p>
            <strong>
              The analytics vendor for this cookie has not been chosen yet, so this section
              will be updated with the processor&rsquo;s name and location before the cookie
              is switched on in production.
            </strong>{" "}
            Until then, declining and accepting have the same practical effect.
          </p>

          <h2>Recent searches are not a cookie</h2>
          <p>
            The pick list on the index page is written to your browser&rsquo;s local storage.
            It is readable only by this site, on this device, and it is never transmitted.
            Clearing it is one button on the index page, or clearing site data in your
            browser. If your browser blocks storage, the list simply stays empty and nothing
            else changes.
          </p>

          <h2>Changing your mind</h2>
          <p>
            Clear this site&rsquo;s data in your browser and the consent question is asked
            again from scratch. Declining is remembered the same way accepting is — we do not
            treat a decline as an invitation to ask again tomorrow.
          </p>

          <h2>Contributions</h2>
          <p>
            Corrections and new entries are handled as public issues on GitHub, under
            GitHub&rsquo;s own privacy terms rather than ours. Anything you write in an issue
            is public — do not paste real hostnames, usernames, tenant identifiers or
            customer names into one.{" "}
            <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer">
              The issue tracker is here
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
