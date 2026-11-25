/**
 * Log paths drawn as the folders they share.
 *
 * Pure and import-free on purpose: `scripts/check-tree.mjs` loads this file
 * directly and asserts that every line put in comes back out identical. The
 * tree is presentation only - a path is never edited, only split on the
 * separator it already uses and joined back with the same one.
 */

export interface TreeNode<T> {
  /** One path segment, verbatim. Empty for the root of an absolute POSIX path. */
  segment: string;
  /** The separator this node's path uses: "\" or "/". */
  sep: string;
  children: TreeNode<T>[];
  /** What lives exactly here. `dir` is true when the line ended in a separator. */
  entries: { item: T; dir: boolean }[];
}

export interface PathTree<T> {
  roots: TreeNode<T>[];
  /** Lines that are not filesystem paths (a command, an Event Viewer channel). */
  flat: T[];
}

/** Starts like a path: an env var, a home or root, a drive, or a relative dot. */
const LOOKS_LIKE_PATH = /^(?:[%~$/\\]|[A-Za-z]:[\\/]|\.{1,2}[\\/])/;

export function buildTree<T>(items: { line: string; item: T }[]): PathTree<T> {
  const roots: TreeNode<T>[] = [];
  const flat: T[] = [];

  for (const { line, item } of items) {
    if (!LOOKS_LIKE_PATH.test(line)) {
      flat.push(item);
      continue;
    }
    const sep = line.includes("\\") ? "\\" : "/";
    const segments = line.split(sep);
    const dir = segments.length > 1 && segments[segments.length - 1] === "";
    if (dir) segments.pop();

    let level = roots;
    let node: TreeNode<T> | undefined;
    for (const segment of segments) {
      node = level.find((n) => n.segment === segment && n.sep === sep);
      if (!node) {
        node = { segment, sep, children: [], entries: [] };
        level.push(node);
      }
      level = node.children;
    }
    node!.entries.push({ item, dir });
  }

  return { roots, flat };
}

/** Every entry's line, rebuilt from the tree. The check compares these to the input. */
export function treeLines<T>(roots: TreeNode<T>[], prefix: string[] = []): { item: T; line: string }[] {
  return roots.flatMap((node) => {
    const here = [...prefix, node.segment];
    return [
      ...node.entries.map(({ item, dir }) => ({ item, line: here.join(node.sep) + (dir ? node.sep : "") })),
      ...treeLines(node.children, here),
    ];
  });
}
