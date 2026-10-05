import type { Metadata } from "next";
import Link from "next/link";
import { AisleBand, BayHead } from "@/components/AdminChrome";
import { SharePost } from "@/components/AdminShare";
import { PLATFORM_META } from "@/lib/api";
import { pathLines, resolveApp, type App } from "@/lib/model";
import { whoAmI } from "@/lib/server/admin";
import { getSnapshot } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Log path of the day" };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wherethemlogs.app";

/** X counts a link as 23 characters and Bluesky counts it in full, so this budgets the full URL. */
const SHORT_BUDGET = 280;

const DAY_MS = 86_400_000;

const today = () => new Date().toISOString().slice(0, 10);

function dayNumber(day: string): number {
  const ms = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(ms) ? Math.floor(Date.now() / DAY_MS) : Math.floor(ms / DAY_MS);
}

function shiftDay(day: string, by: number): string {
  return new Date((dayNumber(day) + by) * DAY_MS).toISOString().slice(0, 10);
}

/**
 * One line per platform, the first path recorded there - the same path the
 * app page leads with.
 */
function pathRows(app: App): string[] {
  return PLATFORM_META.flatMap(({ id, name }) => {
    const first = app.logPaths.find((p) => p.platform === id);
    return first ? [`${name}: ${pathLines(first.path)[0] ?? first.path}`] : [];
  });
}

function posts(name: string, rows: string[], url: string): { short: string; long: string } {
  const head = `Log path of the day: ${name}`;
  let kept = rows;
  // Drop trailing platforms until the short post fits; the first always stays.
  while (kept.length > 1 && `${head}\n\n${kept.join("\n")}\n\n${url}`.length > SHORT_BUDGET) {
    kept = kept.slice(0, -1);
  }
  return {
    short: `${head}\n\n${kept.join("\n")}\n\n${url}`,
    long: `${head}\n\n${rows.join("\n")}\n\nEvery recorded path for ${name}, by platform and installer type:\n${url}\n\n#sysadmin #EndpointManagement #MacAdmins #Intune`,
  };
}

export default async function ShareOfTheDay({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; app?: string }>;
}) {
  const who = await whoAmI();
  const { d, app: wanted } = await searchParams;
  const day = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today();

  let snapshot: Awaited<ReturnType<typeof getSnapshot>>;
  try {
    snapshot = await getSnapshot();
  } catch {
    // The store is unreachable. Say so rather than 500ing the page.
    return (
      <>
        <AisleBand
          trail={[{ label: "Catalogue", href: "/admin" }, { label: "Log path of the day" }]}
          who={who?.userDetails ?? null}
        />
        <main className="rack">
          <div className="void">
            <h2 className="void__h">The catalogue is not answering</h2>
            <p className="void__p">Nothing to pick from until the store is back. Reload in a moment.</p>
          </div>
        </main>
      </>
    );
  }
  const { apps, vendors } = snapshot;
  const stocked = apps.filter((a) => a.logPaths.length).sort((a, b) => a.slug.localeCompare(b.slug));
  // ponytail: "covers two or more platforms" stands in for "well known". Swap for
  // a hand-picked list or search counts if the daily pick reads too obscure.
  const crossPlatform = stocked.filter((a) => new Set(a.logPaths.map((p) => p.platform)).size > 1);
  const pool = crossPlatform.length ? crossPlatform : stocked;

  const picked =
    (wanted && apps.find((a) => a.slug === wanted)) ||
    // A prime stride walks the pool in a scattered order instead of alphabetically.
    pool[(((dayNumber(day) * 7919) % pool.length) + pool.length) % pool.length];

  const resolved = picked ? resolveApp(picked, vendors.get(picked.vendorId)) : null;
  const url = resolved ? `${siteUrl}/apps/${resolved.slug}` : "";
  const text = resolved ? posts(resolved.name, pathRows(picked!), url) : null;

  return (
    <>
      <AisleBand
        trail={[{ label: "Catalogue", href: "/admin" }, { label: "Log path of the day" }]}
        who={who?.userDetails ?? null}
      />

      <main className="rack">
        <BayHead
          name="Log path of the day"
          back={{ label: "Catalogue", href: "/admin" }}
          facts={`${day} · ${resolved ? resolved.name : "no app"} · picked from ${pool.length} apps`}
          actions={
            <>
              <Link href={`/admin/share?d=${shiftDay(day, -1)}`} className="btn btn--ghost tag mono">
                Previous day
              </Link>
              <Link href={`/admin/share?d=${shiftDay(day, 1)}`} className="btn btn--ghost tag mono">
                Next day
              </Link>
            </>
          }
        />

        <form method="get" action="/admin/share" className="fields">
          <div className="frow">
            <label className="tag mono frow__label" htmlFor="share-app">
              Pick an app
            </label>
            <div className="frow__cell">
              <input
                id="share-app"
                name="app"
                list="share-apps"
                className="frow__in mono"
                defaultValue={wanted ?? ""}
                placeholder="slug, e.g. slack"
                autoComplete="off"
              />
              <datalist id="share-apps">
                {stocked.map((a) => (
                  <option key={a.id} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </datalist>
              <button type="submit" className="btn btn--ghost tag mono">
                Use this app
              </button>
            </div>
          </div>
        </form>

        {text ? (
          <SharePost short={text.short} long={text.long} url={url} />
        ) : (
          <div className="void">
            <h2 className="void__h">Nothing to share</h2>
            <p className="void__p">No app in the catalogue has a log path yet.</p>
          </div>
        )}
      </main>
    </>
  );
}
