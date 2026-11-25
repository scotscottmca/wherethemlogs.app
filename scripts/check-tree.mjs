// Every catalogue path must survive the folder tree untouched: build the tree
// from each app's lines, rebuild the lines from it, and compare.
//   node scripts/check-tree.mjs [file.json ...]   (default: scripts/seed-data.json)
// Needs a Node that strips TypeScript types on import (22.18+ or 23.6+).
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { buildTree, treeLines } from "../lib/tree.ts";

const files = process.argv.slice(2);
if (!files.length) files.push(new URL("./seed-data.json", import.meta.url).pathname);

let lines = 0;
let flat = 0;
for (const file of files) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  // Seed shape (logPaths/path) or the import file shape (logs/path).
  const apps = data.apps ?? (data.vendors ?? []).flatMap((v) => v.apps ?? []);
  for (const app of apps) {
    const items = (app.logPaths ?? app.logs ?? []).flatMap((p) =>
      p.path.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => ({ line, item: line })),
    );
    const tree = buildTree(items);
    const rebuilt = treeLines(tree.roots);
    for (const { item, line } of rebuilt) assert.equal(line, item, `${app.name}: path changed in the tree`);
    assert.equal(rebuilt.length + tree.flat.length, items.length, `${app.name}: a path was dropped or doubled`);
    lines += items.length;
    flat += tree.flat.length;
  }
}
console.log(`ok - ${lines} paths rebuilt identically (${flat} shown flat, not as folders)`);
