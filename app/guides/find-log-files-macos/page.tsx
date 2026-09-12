import Link from "next/link";
import type { Metadata } from "next";
import { GuideSheet } from "@/components/GuideSheet";
import { guideBySlug } from "@/lib/guides";

const guide = guideBySlug("find-log-files-macos")!;

export const metadata: Metadata = {
  title: guide.title,
  description: guide.blurb,
  alternates: { canonical: `/guides/${guide.slug}` },
  openGraph: { url: `/guides/${guide.slug}`, title: guide.title, description: guide.blurb },
};

const CONTENTS = [
  { id: "four-places", label: "The four places" },
  { id: "sandbox", label: "What the sandbox does to a path" },
  { id: "unified-log", label: "The unified log" },
  { id: "finding-it", label: "Finding it anyway" },
];

export default function Page() {
  return (
    <GuideSheet guide={guide} contents={CONTENTS}>
      <p>
        macOS looks tidier than Windows about this and mostly is: there are real
        conventions, and applications mostly follow them. The complication is
        sandboxing, which takes an application that follows the conventions perfectly
        and moves its entire Library directory somewhere else.
      </p>

      <h2 id="four-places">The four places</h2>

      <table className="sheet__table">
        <thead>
          <tr>
            <th>Location</th>
            <th>Used for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="mono">~/Library/Logs</td>
            <td>Per-user application logs. The convention, when an app follows it</td>
          </tr>
          <tr>
            <td className="mono">~/Library/Application Support</td>
            <td>Per-user state. Cross-platform apps keep a logs folder in here instead</td>
          </tr>
          <tr>
            <td className="mono">/Library/Logs</td>
            <td>One copy for every account. Installers, daemons, system components</td>
          </tr>
          <tr>
            <td className="mono">/var/log</td>
            <td>The Unix underneath. System daemons, and anything ported from Linux</td>
          </tr>
        </tbody>
      </table>

      <p>
        <code className="mono">~/Library</code> is hidden in Finder. Open it with
        Go &gt; Go to Folder (<kbd>Shift</kbd>+<kbd>Cmd</kbd>+<kbd>G</kbd>) and type the
        path, or hold <kbd>Option</kbd> while the Go menu is open.
      </p>

      <p>
        Applications written for the Mac first tend to use{" "}
        <code className="mono">~/Library/Logs</code> properly:{" "}
        <Link href="/apps/spotify">Spotify</Link> writes to{" "}
        <code className="mono">~/Library/Logs/Spotify/</code>. Applications ported from
        somewhere else usually keep their logs beside the rest of their state instead -{" "}
        <Link href="/apps/slack">Slack</Link> uses{" "}
        <code className="mono">~/Library/Application Support/Slack/logs/</code>, and{" "}
        <Link href="/apps/visual-studio-code">Visual Studio Code</Link>{" "}
        <code className="mono">~/Library/Application Support/Code/logs/</code>. Both
        habits are common enough that checking only one of the two directories is how
        people conclude an application does not log.
      </p>

      <h2 id="sandbox">What the sandbox does to a path</h2>
      <p>
        A sandboxed application cannot write to{" "}
        <code className="mono">~/Library</code> directly. macOS gives it a container of
        its own and redirects everything into it, so the path it thinks it is writing
        to is not the path you need to open:
      </p>
      <pre className="sheet__code">
{`~/Library/Containers/<bundle-id>/Data/Library/Logs/`}
      </pre>
      <p>
        <Link href="/apps/1password">1Password</Link> is a clean example:{" "}
        <code className="mono">
          ~/Library/Containers/com.1password.1password/Data/Library/Logs/1Password/
        </code>
        . The tail of that path is exactly what an unsandboxed application would have
        used; everything before <code className="mono">Data/</code> is the sandbox.
      </p>
      <p>
        Applications that share data between several of their own processes, or with
        an extension, use a group container instead -{" "}
        <code className="mono">~/Library/Group Containers/&lt;team-id&gt;.&lt;group&gt;/</code>.{" "}
        <Link href="/apps/microsoft-teams">Microsoft Teams</Link> logs under{" "}
        <code className="mono">
          ~/Library/Group Containers/UBF8T346G9.com.microsoft.teams/
        </code>
        , where <code className="mono">UBF8T346G9</code> is Microsoft&rsquo;s team
        identifier and never changes.
      </p>
      <p>
        Sandboxing follows from how the application was distributed, which is why the
        same application can have two different paths on the same Mac. That is covered
        in{" "}
        <Link href="/guides/why-log-paths-differ">
          why log paths differ between installer types
        </Link>
        .
      </p>

      <h2 id="unified-log">The unified log</h2>
      <p>
        Since macOS 10.12 the system has its own structured log, and a lot of what used
        to go to a file goes there instead. It is not a file you can open: it is a
        binary store you query.
      </p>
      <pre className="sheet__code">
{`log show --predicate 'subsystem == "com.docker.docker"' --last 1h
log stream --predicate 'process == "1Password"' --level debug`}
      </pre>
      <p>
        Console.app is the same data with a window around it, and its sidebar also
        lists crash reports, which live in{" "}
        <code className="mono">~/Library/Logs/DiagnosticReports/</code> as{" "}
        <code className="mono">.ips</code> files. A crash report is the first thing to
        read when an application quits rather than misbehaves.
      </p>

      <h2 id="finding-it">Finding it anyway</h2>
      <p>
        Reproduce the problem, then ask the filesystem what changed. Because sandbox
        containers sit under <code className="mono">~/Library</code> too, one search
        covers both cases:
      </p>
      <pre className="sheet__code">
{`find ~/Library /Library/Logs -type f \\( -name '*.log' -o -name '*.txt' \\) -mmin -5 2>/dev/null`}
      </pre>
      <p>
        If that finds nothing, the application may be writing to the unified log rather
        than to disk. Try <code className="mono">log stream --process &lt;name&gt;</code>{" "}
        and reproduce the problem again.
      </p>
      <p>
        <Link href="/">Search the catalogue</Link> for the application by name and it
        will give you the exact path, container and all.
      </p>
    </GuideSheet>
  );
}
