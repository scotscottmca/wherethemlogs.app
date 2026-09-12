/**
 * The evergreen guides.
 *
 * Plain TSX pages under app/guides/*, one directory each, listed here so the
 * index, the sitemap and the app pages all read the same list. No MDX: four
 * pages that change a couple of times a year do not need a content pipeline,
 * and the site's own prose styles already exist in app/components.css.
 */
import type { Platform } from "./model";

export interface Guide {
  slug: string;
  title: string;
  /** The index card's line, and the page's meta description. */
  blurb: string;
  /** Sitemap lastmod, and the "Last updated" stamp on the page. */
  updated: string;
}

export const GUIDES: Guide[] = [
  {
    slug: "find-log-files-windows",
    title: "How to find application log files on Windows",
    blurb:
      "Roaming and Local AppData, ProgramData, the install directory and Event Viewer: which one an application writes to, and how to tell which without guessing.",
    updated: "2026-09-12",
  },
  {
    slug: "find-log-files-macos",
    title: "How to find application log files on macOS",
    blurb:
      "~/Library/Logs, /Library/Logs, sandbox containers and the unified log: the four places a Mac application can be writing, and how sandboxing moves the path.",
    updated: "2026-09-12",
  },
  {
    slug: "find-log-files-linux",
    title: "Where installed apps store logs on Linux",
    blurb:
      "/var/log, the journal, and the XDG directories a desktop application writes under, including where Snap and Flatpak put the same file instead.",
    updated: "2026-09-12",
  },
  {
    slug: "why-log-paths-differ",
    title: "Why log paths differ between installer types",
    blurb:
      "The same version of the same application logs somewhere else depending on how it was installed. What MSI, MSIX, Store, pkg, Mac App Store, deb, Snap, Flatpak and AppImage each do to the path.",
    updated: "2026-09-12",
  },
];

export const guideBySlug = (slug: string): Guide | undefined =>
  GUIDES.find((g) => g.slug === slug);

/** The guide an app page points at, for each platform it has paths on. */
export const PLATFORM_GUIDE: Record<Platform, string> = {
  windows: "find-log-files-windows",
  macos: "find-log-files-macos",
  linux: "find-log-files-linux",
};
