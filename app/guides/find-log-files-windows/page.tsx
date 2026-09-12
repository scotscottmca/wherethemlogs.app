import Link from "next/link";
import type { Metadata } from "next";
import { GuideSheet } from "@/components/GuideSheet";
import { guideBySlug } from "@/lib/guides";

const guide = guideBySlug("find-log-files-windows")!;

export const metadata: Metadata = {
  title: guide.title,
  description: guide.blurb,
  alternates: { canonical: `/guides/${guide.slug}` },
  openGraph: { url: `/guides/${guide.slug}`, title: guide.title, description: guide.blurb },
};

const CONTENTS = [
  { id: "four-places", label: "The four places" },
  { id: "which-one", label: "Which one an app uses" },
  { id: "finding-it", label: "Finding it anyway" },
  { id: "event-log", label: "The Event Log is not the same thing" },
];

export default function Page() {
  return (
    <GuideSheet guide={guide} contents={CONTENTS}>
      <p>
        Windows has no single log directory. An application chooses where to write,
        and which of four conventions it picks depends on who it logs for, whether it
        runs as a service, and how it was installed. Once you know the four, a path
        you have never seen before is usually readable at a glance.
      </p>

      <h2 id="four-places">The four places</h2>

      <table className="sheet__table">
        <thead>
          <tr>
            <th>Location</th>
            <th>Expands to</th>
            <th>Used for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="mono">%APPDATA%</td>
            <td className="mono">C:\Users\you\AppData\Roaming</td>
            <td>Per-user data meant to follow the account onto another machine</td>
          </tr>
          <tr>
            <td className="mono">%LOCALAPPDATA%</td>
            <td className="mono">C:\Users\you\AppData\Local</td>
            <td>Per-user data tied to this machine. Most desktop apps log here</td>
          </tr>
          <tr>
            <td className="mono">%PROGRAMDATA%</td>
            <td className="mono">C:\ProgramData</td>
            <td>One copy for every account. Services and machine-wide components</td>
          </tr>
          <tr>
            <td className="mono">%PROGRAMFILES%</td>
            <td className="mono">C:\Program Files</td>
            <td>The install directory itself. Older software, and games</td>
          </tr>
        </tbody>
      </table>

      <p>
        A logs directory should not really be roaming - nobody wants yesterday&rsquo;s
        crash dumps syncing to a new desktop - but plenty of applications put it there
        anyway, because that is where the rest of their per-user state already lives.{" "}
        <Link href="/apps/slack">Slack</Link> logs under{" "}
        <code className="mono">{"%APPDATA%\\Slack\\"}</code>;{" "}
        <Link href="/apps/visual-studio-code">Visual Studio Code</Link> under{" "}
        <code className="mono">{"%APPDATA%\\Code\\logs\\"}</code>. Both of those are
        Roaming.
      </p>

      <p>
        <code className="mono">%LOCALAPPDATA%</code> is the more common home for
        anything large or machine-specific.{" "}
        <Link href="/apps/google-chrome">Google Chrome</Link> writes its debug log to{" "}
        <code className="mono">{"%LOCALAPPDATA%\\Google\\Chrome\\User Data\\chrome_debug.log"}</code>
        , and <Link href="/apps/microsoft-teams">Microsoft Teams</Link> - the current
        one, which ships as a Store package - writes under{" "}
        <code className="mono">
          {"%LOCALAPPDATA%\\Packages\\MSTeams_8wekyb3d8bbwe\\LocalCache\\"}
        </code>
        . That <code className="mono">{"Packages\\"}</code> tree is not a coincidence,
        and it is covered in{" "}
        <Link href="/guides/why-log-paths-differ">why log paths differ between installer types</Link>.
      </p>

      <p>
        <code className="mono">%PROGRAMDATA%</code> is where anything running as a
        service ends up, because a service has no user profile to write into.{" "}
        <Link href="/apps/docker-desktop">Docker Desktop</Link> splits along exactly
        that line: the desktop application logs to{" "}
        <code className="mono">{"%LOCALAPPDATA%\\Docker\\log.txt"}</code> while its
        privileged service logs to{" "}
        <code className="mono">{"%PROGRAMDATA%\\DockerDesktop\\service.txt"}</code>.
      </p>

      <p>
        The install directory is the oldest convention and it has not died.{" "}
        <Link href="/apps/steam">Steam</Link> still keeps{" "}
        <code className="mono">{"C:\\Program Files (x86)\\Steam\\logs\\"}</code>, which
        is also why those files need an elevated editor to delete.
      </p>

      <h2 id="which-one">Which one an app uses</h2>
      <p>Three questions settle it most of the time:</p>
      <ul>
        <li>
          <strong>Does it log before anyone signs in?</strong> Then it cannot be under a
          user profile. Look in <code className="mono">%PROGRAMDATA%</code> or the
          install directory.
        </li>
        <li>
          <strong>Is there a separate service or updater?</strong> Expect two log
          locations, not one - a per-user one and a machine-wide one, as with Docker
          Desktop above.
        </li>
        <li>
          <strong>Did it come from the Microsoft Store?</strong> Then the per-user path
          is inside <code className="mono">{"%LOCALAPPDATA%\\Packages\\"}</code> even if
          the documentation says otherwise.
        </li>
      </ul>

      <h2 id="finding-it">Finding it anyway</h2>
      <p>
        When the application is not in the catalogue and its documentation is silent,
        the fastest honest method is to look at what it just touched. Reproduce the
        problem, then sort by modified date:
      </p>
      <pre className="sheet__code">
{`Get-ChildItem $env:LOCALAPPDATA, $env:APPDATA, $env:PROGRAMDATA -Recurse -Include *.log,*.txt -ErrorAction SilentlyContinue |
  Where-Object LastWriteTime -gt (Get-Date).AddMinutes(-5) |
  Sort-Object LastWriteTime -Descending | Select-Object -First 20 FullName, LastWriteTime`}
      </pre>
      <p>
        Anything written in the last five minutes is a candidate. If that comes back
        empty, the application is either logging somewhere unusual or not logging at
        all until you switch it on - a verbose or debug flag that has to be set first
        is common enough that the catalogue records it in an app&rsquo;s notes.
      </p>
      <p>
        <code className="mono">%TEMP%</code> is worth a look too. Installers in
        particular write there:{" "}
        <code className="mono">{"%TEMP%\\MSI*.log"}</code> for a Windows Installer
        package, when it has been told to log at all.
      </p>

      <h2 id="event-log">The Event Log is not the same thing</h2>
      <p>
        Event Viewer shows the Windows Event Log, which is a structured system service
        applications can write into. It is not where most application logs live. A
        well-behaved service writes its start and stop events there and its detail to a
        file; a desktop application often writes nothing there at all. Check it for
        crashes (<code className="mono">Application</code> log, source{" "}
        <code className="mono">Application Error</code>) and treat the file on disk as
        the real log.
      </p>
      <p>
        <Link href="/">Search the catalogue</Link> for the application by name and it
        will give you the exact path, qualified by installer type and architecture,
        rather than the folder it probably lives in.
      </p>
    </GuideSheet>
  );
}
