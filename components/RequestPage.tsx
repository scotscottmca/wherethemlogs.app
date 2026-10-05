import Link from "next/link";
import { Header, Footer } from "./Chrome";
import { Consent } from "./Consent";
import { RequestForm } from "./RequestForm";
import { IconArrow } from "./Icons";
import { githubAppConfigured } from "@/lib/server/github-app";
import { turnstileConfigured } from "@/lib/server/turnstile";

/**
 * The shell both request pages share. The keys are read at request time, not
 * baked into the build, and with either missing the page says so and hands
 * over to the GitHub form instead.
 */
export function RequestPage({
  kind,
  title,
  lede,
  initial,
  fallbackUrl,
}: {
  kind: "add" | "correction";
  title: string;
  lede: React.ReactNode;
  initial: { app?: string; platform?: string };
  fallbackUrl: string;
}) {
  const on = githubAppConfigured() && turnstileConfigured();

  return (
    <>
      <Header />
      <main className="rack">
        <div className="picklist">
          <div>
            <h1 className="void__h" style={{ margin: 0 }}>
              {title}
            </h1>
          </div>
          <div>
            <p className="tag mono" style={{ margin: 0 }}>
              Becomes a public GitHub issue
            </p>
          </div>
        </div>

        <section className="appPanel">
          <p>{lede}</p>
          <p className="appPanel__aside">
            No account needed. Paste paths exactly as written, with environment variables like{" "}
            <code>%LOCALAPPDATA%</code> left unexpanded, and leave out anything that identifies a
            real machine, person or customer. Everything here is published on GitHub. See{" "}
            <Link href="/privacy">privacy</Link> for what the human check involves.
          </p>
        </section>

        {on ? (
          <RequestForm
            kind={kind}
            siteKey={process.env.TURNSTILE_SITE_KEY!}
            initial={initial}
            fallbackUrl={fallbackUrl}
          />
        ) : (
          <div className="void">
            <h2 className="void__h">This form is not switched on yet</h2>
            <p className="void__p">The same request can be filed on GitHub, with a free account.</p>
            <div className="void__acts">
              <a className="btn tag mono" href={fallbackUrl} target="_blank" rel="noopener noreferrer">
                Open the GitHub form
                <IconArrow size={15} />
              </a>
            </div>
          </div>
        )}
      </main>
      <Footer entryCount={null} />
      <Consent />
    </>
  );
}
