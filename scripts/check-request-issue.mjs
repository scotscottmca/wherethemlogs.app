// The on-site request form files issues that the import-file bot must read
// exactly as it reads one from the GitHub issue form. This builds issues with
// lib/requests.ts and parses them with .github/scripts/issue-to-import.cjs.
//
//   node scripts/check-request-issue.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { issueFor } from "../lib/requests.ts";

const { build } = createRequire(import.meta.url)("../.github/scripts/issue-to-import.cjs");

const add = issueFor({
  kind: "add",
  app: "Visual Studio Code",
  vendor: "Microsoft",
  aliases: "vscode, code",
  paths: { windows: "%APPDATA%\\Code\\logs\\ | Session logs", macos: "~/Library/Containers/com.microsoft.<Word|Excel>/Logs/" },
  installers: { windows: ["msi"], macos: ["dmg"], linux: [] },
  architectures: ["x64"],
  scope: "per-user",
  verification: "My machine, and https://code.visualstudio.com/docs. cc @someone",
  credit: { github: "octocat", social: "@me" },
});
assert.equal(add.title, "Add: Visual Studio Code");
assert.deepEqual(add.labels, ["addition"]);
assert.deepEqual(build(add.body).file, {
  vendors: [{
    name: "Microsoft",
    apps: [{
      name: "Visual Studio Code",
      aliases: ["vscode", "code"],
      documentation: "https://code.visualstudio.com/docs",
      logs: [
        { os: "windows", path: "%APPDATA%\\Code\\logs\\", what: "Session logs", types: ["msi", "x64"], scope: "per-user" },
        { os: "macos", path: "~/Library/Containers/com.microsoft.<Word|Excel>/Logs/", types: ["dmg", "x64"], scope: "per-user" },
      ],
    }],
  }],
});
// A visitor's @mention must stay inside a fence, where GitHub notifies nobody.
assert.ok(!add.body.replace(/```text[\s\S]*?```/g, "").includes("@someone"));

const bare = issueFor({ kind: "add", app: "X", vendor: "Y", paths: { linux: "/var/log/x.log" }, installers: {}, architectures: [], verification: "docs", credit: {} });
const [log] = build(bare.body).file.vendors[0].apps[0].logs;
assert.equal(log.scope, undefined);
assert.equal(log.types, undefined);

const correction = issueFor({ kind: "correction", app: "Teams", platform: "Windows", listed: "a", problem: "The path is incorrect", correct: "b", verification: "c", credit: {} });
assert.equal(correction.title, "Correction: Teams (Windows)");
assert.deepEqual(correction.labels, ["correction"]);

console.log("ok");
