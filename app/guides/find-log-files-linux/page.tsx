import Link from "next/link";
import type { Metadata } from "next";
import { GuideSheet } from "@/components/GuideSheet";
import { guideBySlug } from "@/lib/guides";

const guide = guideBySlug("find-log-files-linux")!;

export const metadata: Metadata = {
  title: guide.title,
  description: guide.blurb,
  alternates: { canonical: `/guides/${guide.slug}` },
  openGraph: { url: `/guides/${guide.slug}`, title: guide.title, description: guide.blurb },
};

const CONTENTS = [
  { id: "system", label: "System logs: /var/log and the journal" },
  { id: "user", label: "Desktop apps: the XDG directories" },
  { id: "packaging", label: "Snap, Flatpak and AppImage" },
  { id: "finding-it", label: "Finding it anyway" },
];

export default function Page() {
  return (
    <GuideSheet guide={guide} contents={CONTENTS}>
      <p>
        Linux splits cleanly in two. Anything that runs as a service logs to the system
        - <code className="mono">/var/log</code>, or the systemd journal. Anything that
        runs as you logs under your home directory, in one of three XDG locations that
        are frequently confused for each other. Packaging then moves the second half
        again.
      </p>

      <h2 id="system">System logs: /var/log and the journal</h2>
      <p>
        <code className="mono">/var/log</code> is the traditional home, one directory or
        file per service. <Link href="/apps/nginx">Nginx</Link> writes{" "}
        <code className="mono">/var/log/nginx/error.log</code>;{" "}
        <Link href="/apps/postgresql">PostgreSQL</Link> writes{" "}
        <code className="mono">/var/log/postgresql/postgresql-&lt;version&gt;-main.log</code>{" "}
        on Debian and Ubuntu but{" "}
        <code className="mono">/var/lib/pgsql/&lt;version&gt;/data/log/</code> on Red Hat
        family distributions, which is the single most common reason a path copied off
        a forum does not exist on your machine.
      </p>
      <p>
        Applications that ship their own directory layout rather than the
        distribution&rsquo;s ignore <code className="mono">/var/log</code> entirely.{" "}
        <Link href="/apps/apache-tomcat">Apache Tomcat</Link> writes to{" "}
        <code className="mono">$CATALINA_BASE/logs/catalina.out</code>, wherever
        <code className="mono">CATALINA_BASE</code> happens to point.
      </p>
      <p>
        On any systemd distribution, a service&rsquo;s standard output goes to the
        journal instead of a file, and there may be no file at all:
      </p>
      <pre className="sheet__code">
{`journalctl -u nginx --since "10 min ago"
journalctl -u nginx -f          # follow
journalctl --user -u <unit>     # your own user units, not the system's`}
      </pre>
      <p>
        The journal is binary and rotates on its own terms. If you need a file to send
        someone, redirect it: <code className="mono">journalctl -u nginx &gt; nginx.txt</code>.
      </p>

      <h2 id="user">Desktop apps: the XDG directories</h2>

      <table className="sheet__table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>Default</th>
            <th>Meant for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="mono">$XDG_CONFIG_HOME</td>
            <td className="mono">~/.config</td>
            <td>Settings. Not logs, in theory</td>
          </tr>
          <tr>
            <td className="mono">$XDG_STATE_HOME</td>
            <td className="mono">~/.local/state</td>
            <td>Logs and history. The correct answer, and the least used</td>
          </tr>
          <tr>
            <td className="mono">$XDG_DATA_HOME</td>
            <td className="mono">~/.local/share</td>
            <td>Application data that should be backed up</td>
          </tr>
          <tr>
            <td className="mono">$XDG_CACHE_HOME</td>
            <td className="mono">~/.cache</td>
            <td>Disposable. Some applications log here, which is why logs vanish</td>
          </tr>
        </tbody>
      </table>

      <p>
        <code className="mono">$XDG_STATE_HOME</code> was added to the specification
        late, and adoption has been slow, so most applications still put their logs in{" "}
        <code className="mono">~/.config</code> beside their settings.{" "}
        <Link href="/apps/slack">Slack</Link> uses{" "}
        <code className="mono">~/.config/Slack/logs/</code>, and{" "}
        <Link href="/apps/obs-studio">OBS Studio</Link>{" "}
        <code className="mono">~/.config/obs-studio/logs/</code>. Games and large
        applications lean on <code className="mono">~/.local/share</code> -{" "}
        <Link href="/apps/steam">Steam</Link> keeps{" "}
        <code className="mono">~/.local/share/Steam/logs/</code>. And{" "}
        <Link href="/apps/spotify">Spotify</Link> writes under{" "}
        <code className="mono">~/.cache/spotify/</code>, which means anything that
        cleans caches deletes the evidence.
      </p>
      <p>
        Check all four before concluding an application does not log. The variables are
        only defaults: if <code className="mono">$XDG_STATE_HOME</code> is set in your
        environment, the real path is wherever it points.
      </p>

      <h2 id="packaging">Snap, Flatpak and AppImage</h2>
      <p>
        Confined packaging redirects the home directory the application sees, so the
        XDG paths above still apply - just not where you expect them:
      </p>
      <table className="sheet__table">
        <thead>
          <tr>
            <th>Format</th>
            <th>Where the same file ends up</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="mono">snap</td>
            <td className="mono">~/snap/&lt;name&gt;/current/.config/...</td>
          </tr>
          <tr>
            <td className="mono">flatpak</td>
            <td className="mono">~/.var/app/&lt;app-id&gt;/config/...</td>
          </tr>
          <tr>
            <td className="mono">appimage</td>
            <td>Unconfined: the normal XDG paths, as if installed from a tarball</td>
          </tr>
        </tbody>
      </table>
      <p>
        So the same application, same version, logs to{" "}
        <code className="mono">~/.config/obs-studio/logs/</code> from a distribution
        package and{" "}
        <code className="mono">~/.var/app/com.obsproject.Studio/config/obs-studio/logs/</code>{" "}
        from Flatpak. The catalogue records both, tagged by installer type -{" "}
        <Link href="/guides/why-log-paths-differ">
          why log paths differ between installer types
        </Link>{" "}
        explains the rest.
      </p>

      <h2 id="finding-it">Finding it anyway</h2>
      <pre className="sheet__code">
{`find ~/.config ~/.local/state ~/.local/share ~/.cache ~/.var/app ~/snap \\
  -type f -name '*.log' -mmin -5 2>/dev/null`}
      </pre>
      <p>
        For a service, find out what it has open rather than guessing:
      </p>
      <pre className="sheet__code">
{`sudo lsof -p "$(pgrep -n nginx)" | grep -i log`}
      </pre>
      <p>
        That answers the question for any process, including ones with no documentation
        at all.
      </p>
      <p>
        <Link href="/">Search the catalogue</Link> for the application by name and it
        will give you the exact path for the package format you actually installed.
      </p>
    </GuideSheet>
  );
}
