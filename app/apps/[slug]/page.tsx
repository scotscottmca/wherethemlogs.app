import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/Chrome";
import { Consent } from "@/components/Consent";
import { Plate } from "@/components/Plate";
import { PLATFORM_META, toPlates } from "@/lib/api";
import { getSnapshot } from "@/lib/server/catalog";
import { INSTALLER_TYPES, resolveApp, type ResolvedApp } from "@/lib/model";

export const dynamic = "force-dynamic";

/**
 * Same lookup as app/api/apps/[slug]/route.ts, against the same in-process
 * snapshot - a server component, so it is called directly rather than over
 * this app's own API.
 */
async function loadApp(slug: string): Promise<ResolvedApp | null> {
  const { apps, vendors } = await getSnapshot();
  const found = apps.find((a) => a.slug === slug);
  if (!found) return null;
  return resolveApp(found, vendors.get(found.vendorId));
}

function platformNames(app: ResolvedApp): string[] {
  return PLATFORM_META.filter((m) => app.platforms.includes(m.id)).map((m) => m.name);
}

const INSTALLER_TYPE_SET = new Set<string>(INSTALLER_TYPES);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  let app: ResolvedApp | null = null;
  try {
    app = await loadApp(slug);
  } catch {
    // The catalogue is unreachable. Fall through to a generic title; the page
    // body handles the same failure with its own message.
  }

  if (!app) return { title: "App not found" };

  const platforms = platformNames(app);
  const installerTypes = app.types.filter((t) => INSTALLER_TYPE_SET.has(t));

  const title = platforms.length
    ? `${app.name} log file locations - ${platforms.join(", ")}`
    : `${app.name} log file locations`;

  const description = `Log file locations for ${app.name}${
    platforms.length ? ` on ${platforms.join(", ")}` : ""
  }${installerTypes.length ? `, covering ${installerTypes.join(", ")} installs` : ""}.`;

  return {
    title,
    description,
    alternates: { canonical: `/apps/${app.slug}` },
    openGraph: { url: `/apps/${app.slug}`, title, description },
  };
}

export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let app: ResolvedApp | null = null;
  let failed = false;
  try {
    app = await loadApp(slug);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <>
        <Header />
        <main className="rack">
          <div className="void">
            <h2 className="void__h">The catalogue is not answering</h2>
            <p className="void__p">
              The index is still there - this is the store, not this page. Reload in a moment.
            </p>
          </div>
        </main>
        <Footer entryCount={null} />
        <Consent />
      </>
    );
  }

  if (!app) notFound();

  const plates = toPlates([app]);
  const pathCount = plates.reduce((n, p) => n + p.logPaths.length, 0);
  const platforms = platformNames(app);

  return (
    <>
      <Header />
      <main className="rack">
        <div className="picklist">
          <div>
            <h1 className="void__h" style={{ margin: 0 }}>
              {app.name}
            </h1>
          </div>
          <div>
            <p className="tag mono" style={{ margin: 0 }}>
              {pathCount} log {pathCount === 1 ? "location" : "locations"}
              {platforms.length ? ` · ${platforms.join(", ")}` : ""}
            </p>
          </div>
        </div>

        <div className="rackNote" style={{ paddingInline: 0, maxWidth: "72ch" }}>
          <p style={{ margin: 0 }}>
            <Link className="tag mono" href={`/vendors/${app.vendor.slug}`}>
              {app.vendor.name}
            </Link>
            {app.documentation && (
              <>
                {" · "}
                <a
                  href={app.documentation}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--hivis)" }}
                >
                  Vendor documentation
                </a>
              </>
            )}
          </p>
          {app.notes && app.notes.length > 0 && (
            <ul style={{ margin: 0 }}>
              {app.notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          )}
        </div>

        {plates.length ? (
          <div className="resultsBody">
            {plates.map((plate, i) => (
              <Plate key={plate.key} plate={plate} index={i} animate />
            ))}
          </div>
        ) : (
          <div className="void">
            <h2 className="void__h">No log locations recorded yet</h2>
            <p className="void__p">
              This application is in the catalogue, but no log paths have been added for it yet.
            </p>
          </div>
        )}
      </main>

      <Footer entryCount={null} />
      <Consent />
    </>
  );
}
