import Link from "next/link";
import type { Metadata } from "next";
import { GuideSheet } from "@/components/GuideSheet";
import { guideBySlug } from "@/lib/guides";

const guide = guideBySlug("why-log-paths-differ")!;

export const metadata: Metadata = {
  title: guide.title,
  description: guide.blurb,
  alternates: { canonical: `/guides/${guide.slug}` },
  openGraph: { url: `/guides/${guide.slug}`, title: guide.title, description: guide.blurb },
};

const CONTENTS = [
  { id: "windows", label: "Windows: MSI, EXE, MSIX and portable" },
  { id: "macos", label: "macOS: pkg, dmg and the App Store" },
  { id: "linux", label: "Linux: deb, rpm, Snap, Flatpak, AppImage" },
  { id: "which", label: "Working out which one you have" },
];

export default function Page() {
  return (
    <GuideSheet guide={guide} contents={CONTENTS}>
      <p>
        The same application, at the same version, on two machines, writing its log to
        two different paths, is not a bug and not a misconfiguration. It is how it was
        installed. Packaging decides whether the application gets the filesystem as it
        is, or a redirected view of it, and a redirected view moves every path the
        application uses without the application knowing.
      </p>
      <p>
        This is why the catalogue tags every path with an installer type rather than
        listing one path per application.
      </p>

      <h2 id="windows">Windows: MSI, EXE, MSIX and portable</h2>

      <table className="sheet__table">
        <thead>
          <tr>
            <th>Type</th>
            <th>What it does to the path</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="mono">msi</td>
            <td>
              Machine-wide install. Logs usually per-user under AppData, or machine-wide
              under ProgramData when a service is involved
            </td>
          </tr>
          <tr>
            <td className="mono">exe</td>
            <td>
              Whatever the vendor&rsquo;s own installer decides. Frequently per-user,
              and frequently a different tree from the same vendor&rsquo;s MSI
            </td>
          </tr>
          <tr>
            <td className="mono">msix</td>
            <td>
              Store or packaged install. Everything is redirected into{" "}
              <span className="mono">{"%LOCALAPPDATA%\\Packages\\<package-family>\\"}</span>
            </td>
          </tr>
          <tr>
            <td>portable</td>
            <td>
              No install at all. Logs usually land beside the executable, wherever that
              was unzipped
            </td>
          </tr>
        </tbody>
      </table>

      <p>
        MSIX is the one that surprises people. A packaged application that writes to{" "}
        <code className="mono">{"%APPDATA%\\Vendor\\App"}</code> in its own code has
        that call redirected, transparently, into its package container. The
        application&rsquo;s documentation is not wrong; it is describing the path the
        application asked for, not the path Windows gave it.
      </p>
      <p>
        <Link href="/apps/microsoft-teams">Microsoft Teams</Link> shows both eras at
        once. Classic Teams was an EXE install and wrote{" "}
        <code className="mono">{"%APPDATA%\\Microsoft\\Teams\\logs.txt"}</code>. The
        current Teams ships as a Store package and writes under{" "}
        <code className="mono">
          {"%LOCALAPPDATA%\\Packages\\MSTeams_8wekyb3d8bbwe\\LocalCache\\"}
        </code>
        . Same vendor, same product name, nothing in common between the paths.
      </p>
      <p>
        A second split runs alongside packaging: per-user against per-machine.{" "}
        <Link href="/apps/docker-desktop">Docker Desktop</Link> writes{" "}
        <code className="mono">{"%LOCALAPPDATA%\\Docker\\log.txt"}</code> for the
        desktop application and{" "}
        <code className="mono">{"%PROGRAMDATA%\\DockerDesktop\\service.txt"}</code> for
        the service that runs regardless of who is signed in. Either can be the one
        with your answer in it, depending on what failed.
      </p>

      <h2 id="macos">macOS: pkg, dmg and the App Store</h2>
      <p>
        A <code className="mono">pkg</code> installer and a{" "}
        <code className="mono">dmg</code> you drag to Applications usually produce the
        same paths: the application is unsandboxed and writes to{" "}
        <code className="mono">~/Library/Logs</code> or{" "}
        <code className="mono">~/Library/Application Support</code> like any other Mac
        application.
      </p>
      <p>
        The Mac App Store build is different, because sandboxing is mandatory there.
        Every write under <code className="mono">~/Library</code> is redirected into a
        container:
      </p>
      <pre className="sheet__code">
{`~/Library/Application Support/App/          # direct download
~/Library/Containers/com.vendor.app/Data/Library/Application Support/App/   # App Store`}
      </pre>
      <p>
        <Link href="/apps/1password">1Password</Link> logs to{" "}
        <code className="mono">
          ~/Library/Containers/com.1password.1password/Data/Library/Logs/1Password/
        </code>
        . Note the shape: the sandbox prefix, then the path the application actually
        asked for. Once you can see that seam, you can translate any unsandboxed path
        into its sandboxed equivalent. More on the containers themselves in{" "}
        <Link href="/guides/find-log-files-macos">
          how to find application log files on macOS
        </Link>
        .
      </p>

      <h2 id="linux">Linux: deb, rpm, Snap, Flatpak, AppImage</h2>
      <p>
        Distribution packages (<code className="mono">deb</code>,{" "}
        <code className="mono">rpm</code>) follow the distribution&rsquo;s layout, which
        is why the same service logs to different places on Debian and on Red Hat:{" "}
        <Link href="/apps/postgresql">PostgreSQL</Link> writes{" "}
        <code className="mono">/var/log/postgresql/</code> on one and{" "}
        <code className="mono">/var/lib/pgsql/&lt;version&gt;/data/log/</code> on the
        other. Nothing was redirected there; the packagers simply chose differently.
      </p>
      <p>
        Snap and Flatpak do redirect. Both give the application a private home
        directory, so its perfectly ordinary XDG paths land inside a container:
      </p>
      <pre className="sheet__code">
{`~/.config/obs-studio/logs/                                    # deb or rpm
~/snap/obs-studio/current/.config/obs-studio/logs/            # snap
~/.var/app/com.obsproject.Studio/config/obs-studio/logs/      # flatpak`}
      </pre>
      <p>
        Those are all <Link href="/apps/obs-studio">OBS Studio</Link>, same version,
        three package formats. AppImage is the exception: it is unconfined, so it uses
        the plain XDG paths in the first line.
      </p>

      <h2 id="which">Working out which one you have</h2>
      <ul>
        <li>
          <strong>Windows.</strong>{" "}
          <code className="mono">Get-AppxPackage *teams*</code> returns something? It is
          MSIX, and the path is under{" "}
          <code className="mono">{"%LOCALAPPDATA%\\Packages\\"}</code>. Otherwise check
          Apps &amp; features, or look for the install directory under{" "}
          <code className="mono">Program Files</code> versus{" "}
          <code className="mono">{"%LOCALAPPDATA%\\Programs\\"}</code>, which is the
          usual sign of a per-user EXE install.
        </li>
        <li>
          <strong>macOS.</strong> An App Store build has a{" "}
          <code className="mono">_MASReceipt</code> folder inside the app bundle, and a
          container under <code className="mono">~/Library/Containers/</code> named for
          its bundle identifier.
        </li>
        <li>
          <strong>Linux.</strong> <code className="mono">snap list</code>,{" "}
          <code className="mono">flatpak list</code>, then your package manager. If none
          of them know about it, it is an AppImage or a tarball.
        </li>
      </ul>
      <p>
        Then <Link href="/">search the catalogue</Link>: every path is tagged with the
        installer types it was verified against, so you can match the one in front of
        you rather than trying all of them.
      </p>
    </GuideSheet>
  );
}
