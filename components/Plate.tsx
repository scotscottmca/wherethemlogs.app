"use client";

import Link from "next/link";
import { IconFlag } from "./Icons";
import { CopyButton } from "./CopyButton";
import { FileManifest } from "./FileManifest";
import { PLATFORM_META, type LogPath, type Plate as PlateData, type Platform } from "@/lib/api";
import { pathLines } from "@/lib/model";
import { buildTree, type TreeNode } from "@/lib/tree";
import { correctionUrl } from "@/lib/site";

const ARCH = new Set(["x86", "x64", "arm64"]);
const SCOPE = new Set(["per-user", "per-machine", "system"]);

const ZONE_CODE: Record<Platform, string> = {
  windows: "WIN",
  macos: "MAC",
  linux: "LNX",
};

const PLATFORM_NAME: Record<Platform, string> = Object.fromEntries(
  PLATFORM_META.map((p) => [p.id, p.name]),
) as Record<Platform, string>;

/**
 * One result card: an app on one platform, in one variant and version. Name
 * and qualifiers across the top, every path with its own copy button, the
 * installer and architecture tags along the foot.
 *
 * `tree` draws the paths as the folders they share (the app page); without it
 * each path is one flat row (results and suggestions).
 *
 * The card has no state of its own - only `CopyButton` is interactive. It
 * stays a client component even so: it is the one place `plate`'s data is
 * handed to the browser, and keeping that a single boundary (one compact
 * reference per card) is what stops the catalogue being duplicated into the
 * page's hydration payload. Splitting the card into a server-rendered shell
 * around several small client rows was tried and measured worse, because Next
 * then has to describe the shell's own markup in that payload too.
 */
export function Plate({
  plate,
  index = 0,
  animate = false,
  selected = false,
  id,
  expandFiles = false,
  tree = false,
}: {
  plate: PlateData;
  index?: number;
  animate?: boolean;
  selected?: boolean;
  id?: string;
  /** Open each path's file list. The app page does; a result card stays folded. */
  expandFiles?: boolean;
  tree?: boolean;
}) {
  const { app, platform, variant, version, logPaths } = plate;

  // Qualifiers are per path; the foot prints the union across this platform.
  const types = [...new Set(logPaths.flatMap((p) => p.types))];
  const scopes = [...new Set(logPaths.flatMap((p) => (p.scope ? [p.scope] : [])))];

  return (
    <article
      id={id}
      className={`plate${selected ? " plate--sel" : ""}${animate ? " rack-in" : ""}`}
      style={animate ? ({ ["--i" as string]: index } as React.CSSProperties) : undefined}
    >
      <div className="plate__body">
        <div className="plate__top">
          {app.resolvedIconUrl && (
            // The app's own icon, or the vendor's when it has none.
            <img
              className="plate__icon"
              src={app.resolvedIconUrl}
              alt=""
              width={22}
              height={22}
              loading="lazy"
              decoding="async"
            />
          )}
          <h3 className="plate__name">
            <Link href={`/apps/${app.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              {app.name}
            </Link>
            {/* The hidden part gives each of an app's several cards a distinct,
                non-repeating heading for screen readers and search engines. The
                visible platform label beside it is hidden from them in turn. */}
            <span className="visually-hidden">
              {" - "}
              {PLATFORM_NAME[platform]}
              {variant ? ` (${variant})` : ""}
              {version ? `, ${version}` : ""}
            </span>
          </h3>
          <span className="tag plate__os" aria-hidden="true">
            {PLATFORM_NAME[platform]}
          </span>
          {variant && <span className="tag plate__variant">{variant}</span>}
          {version && <span className="tag plate__version">{version}</span>}
          <span className="tag plate__vendor">{app.vendor.name}</span>
        </div>

        {tree ? (
          <PathTree logPaths={logPaths} expandFiles={expandFiles} />
        ) : (
          <div className="plate__paths">
            {logPaths.map((p) => (
              <PathRow key={p.id} logPath={p} path={p.path} expandFiles={expandFiles} />
            ))}
          </div>
        )}

        <div className="plate__foot">
          <div className="chips">
            {types.map((t) => (
              <span key={t} className={`chip tag${ARCH.has(t) ? " chip--arch" : ""}`}>
                {t}
              </span>
            ))}
            {scopes.filter((s) => SCOPE.has(s)).map((s) => (
              <span key={s} className="chip tag chip--scope">
                {s}
              </span>
            ))}
          </div>
          <a className="plate__flag tag" href={correctionUrl(app.name, ZONE_CODE[platform])}>
            <IconFlag size={13} />
            Wrong path? Add a variant
          </a>
        </div>
      </div>
    </article>
  );
}

function PathRow({
  logPath,
  path,
  expandFiles,
  extras = true,
}: {
  logPath: LogPath;
  path: string;
  expandFiles: boolean;
  /** The note and file list, printed once per log path. */
  extras?: boolean;
}) {
  const { label, note, files } = logPath;

  return (
    <div className="prow">
      <span className="tag prow__label">{label}</span>
      <code className="prow__path">
        {path}
        {extras && note && <span className="prow__note">{note}</span>}
      </code>
      <CopyButton path={path} label={label} />
      {extras && files && files.length > 0 && (
        <FileManifest path={logPath.path} files={files} open={expandFiles} />
      )}
    </div>
  );
}

/** One line of one log path. `first` carries the note and the file list. */
type Line = { logPath: LogPath; line: string; first: boolean };

/**
 * The card's paths as one folder tree. A folder several paths share is printed
 * once, with the files and folders that differ hanging under it. Each leaf
 * still copies the whole path, exactly as stored.
 */
function PathTree({ logPaths, expandFiles }: { logPaths: LogPath[]; expandFiles: boolean }) {
  const { roots, flat } = buildTree<Line>(
    logPaths.flatMap((logPath) =>
      pathLines(logPath.path).map((line, i) => ({ line, item: { logPath, line, first: i === 0 } })),
    ),
  );

  return (
    <div className="plate__paths">
      {roots.length > 0 && (
        <ul className="tree">
          {roots.map((node, i) => (
            <TreeBranch key={i} node={node} expandFiles={expandFiles} />
          ))}
        </ul>
      )}
      {/* Not a filesystem path (a command, a log channel): printed whole. */}
      {flat.map((l, i) => (
        <PathRow key={i} logPath={l.logPath} path={l.line} expandFiles={expandFiles} extras={l.first} />
      ))}
    </div>
  );
}

function TreeBranch({ node, expandFiles }: { node: TreeNode<Line>; expandFiles: boolean }) {
  // A run of folders with nothing else in them prints on one line.
  const segments = [node.segment];
  let n = node;
  while (n.entries.length === 0 && n.children.length === 1) {
    n = n.children[0];
    segments.push(n.segment);
  }
  const label = segments.join(n.sep) || n.sep;

  return (
    <li>
      {n.entries.length === 0 && (
        <div className="tree__node">
          <code className="tree__seg">{label}</code>
        </div>
      )}
      {n.entries.map(({ item, dir }, i) => (
        <div key={i}>
          <div className="tree__node">
            <code className="tree__seg tree__seg--leaf">
              {label}
              {dir ? n.sep : ""}
            </code>
            <span className="tag">{item.logPath.label}</span>
            <CopyButton path={item.line} label={item.logPath.label} />
          </div>
          {item.first && item.logPath.note && <span className="prow__note">{item.logPath.note}</span>}
          {item.first && item.logPath.files && item.logPath.files.length > 0 && (
            <FileManifest path={item.logPath.path} files={item.logPath.files} open={expandFiles} />
          )}
        </div>
      ))}
      {n.children.length > 0 && (
        <ul>
          {n.children.map((child, i) => (
            <TreeBranch key={i} node={child} expandFiles={expandFiles} />
          ))}
        </ul>
      )}
    </li>
  );
}
