import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer } from "@/components/Chrome";
import { Consent } from "@/components/Consent";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "How to find application log files on Windows, macOS and Linux, and why the same application logs somewhere else depending on how it was installed.",
  alternates: { canonical: "/guides" },
  openGraph: { url: "/guides", title: "Guides" },
};

/** The aisle sign for the guides: what each one answers, and nothing else. */
export default function Guides() {
  return (
    <>
      <Header />
      <main className="sheet">
        <div className="sheet__inner">
          <div className="sheet__head">
            <h1 className="sheet__h1">Guides</h1>
            <p className="sheet__lede">
              The catalogue answers &ldquo;where does this application log?&rdquo;. These
              answer the question underneath it: where any application logs on a given
              platform, and why the same one moves when you install it differently.
            </p>
            <div className="sheet__rule" role="presentation" />
          </div>

          <div className="sheet__body">
            <ul>
              {GUIDES.map((guide) => (
                <li key={guide.slug} style={{ marginBottom: "1rem" }}>
                  <Link href={`/guides/${guide.slug}`}>
                    <strong>{guide.title}</strong>
                  </Link>
                  <br />
                  {guide.blurb}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <Footer entryCount={null} />
      <Consent />
    </>
  );
}
