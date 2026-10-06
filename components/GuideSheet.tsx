import Link from "next/link";
import { Header, Footer } from "./Chrome";
import { Consent } from "./Consent";
import { formatLongDate } from "@/lib/site";
import { GUIDES, type Guide } from "@/lib/guides";

/**
 * The laminated sheet again, with a guide printed on it. Same furniture as
 * /docs - head, rule, stamp, contents - so a guide reads as part of the site
 * rather than a blog bolted onto the side of it.
 */
export function GuideSheet({
  guide,
  contents,
  children,
}: {
  guide: Guide;
  /** Anchor ids and their headings, in page order. */
  contents: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="sheet">
        <div className="sheet__inner">
          <div className="sheet__head">
            <h1 className="sheet__h1 sheet__h1--long">{guide.title}</h1>
            <p className="sheet__lede">{guide.blurb}</p>

            <div className="sheet__rule" role="presentation" />

            <div className="sheet__stamp">
              <Link href="/guides" className="tag mono">
                Guides
              </Link>
              <span className="tag mono">
                Last updated {formatLongDate(new Date(guide.updated))}
              </span>
            </div>

            <nav className="sheet__toc" aria-label="On this page">
              {contents.map((c) => (
                <a key={c.id} href={`#${c.id}`} className="tag mono">
                  {c.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="sheet__body">
            {children}

            <h2 id="more">More guides</h2>
            <ul>
              {others.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides/${g.slug}`}>{g.title}</Link>
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
