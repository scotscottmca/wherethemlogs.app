// Builds a file for the admin portal's import screen from an "Add an application"
// issue. .github/workflows/import-file.yml posts the result as a comment.
// Self-check: node .github/scripts/issue-to-import.cjs

const MARKER = "<!-- import-file -->";
/** Each platform has a "<Name> log paths" box and "<Name> installer type" checkboxes. */
const PLATFORMS = { windows: "Windows", macos: "macOS", linux: "Linux" };

/** The form's answers by label. GitHub renders each one as "### Label", then the answer. */
function answers(body) {
  const out = {};
  for (const part of body.replace(/\r\n/g, "\n").split(/^### /m).slice(1)) {
    const [label, ...rest] = part.split("\n");
    const value = rest.join("\n").trim().replace(/^```\w*\n?([\s\S]*?)\n?```$/, "$1");
    out[label.trim()] = value === "_No response_" ? "" : value;
  }
  return out;
}

/** `{ file }` ready to import, or `{ missing }` naming what the issue still needs. */
function build(body) {
  const a = answers(body);
  const one = (label) => (a[label] ?? "").trim();
  /** The options ticked in a checkboxes field, less "Not sure". */
  const ticked = (label) =>
    [...one(label).matchAll(/^- \[x\] (.+)$/gim)].map((m) => m[1].trim()).filter((x) => x !== "Not sure");

  const architectures = ticked("Architecture");
  // A path has one scope, so it only counts when exactly one box is ticked.
  const scopes = ticked("Scope");
  const scope = scopes.length === 1 ? scopes[0] : undefined;
  const variant = one("Variant") || undefined;

  const logs = [];
  for (const [os, name] of Object.entries(PLATFORMS)) {
    const types = [...ticked(`${name} installer type`), ...architectures];
    for (const line of one(`${name} log paths`).split("\n")) {
      // The last " | " - a path can hold a bare "|", as in com.microsoft.<Word|Excel>.
      const cut = line.lastIndexOf(" | ");
      const path = (cut < 0 ? line : line.slice(0, cut)).trim();
      const what = cut < 0 ? undefined : line.slice(cut + 3).trim() || undefined;
      if (path) logs.push({ os, path, what, variant, types: types.length ? types : undefined, scope });
    }
  }

  const missing = [
    !one("Application") && "the application name",
    !one("Vendor") && "the vendor",
    !logs.length && "at least one log path",
  ].filter(Boolean);
  if (missing.length) return { missing };

  const aliases = one("Also known as").split(",").map((x) => x.trim()).filter(Boolean);
  const documentation = one("How did you verify this?").match(/https?:\/\/[^\s<>()\]]+/)?.[0].replace(/[.,;:!?]+$/, "");
  const notes = one("Anything else");
  const app = {
    name: one("Application"),
    aliases: aliases.length ? aliases : undefined,
    documentation,
    logs,
    notes: notes ? [notes] : undefined,
  };
  // Round-tripped so the undefined keys are gone and the object is exactly what gets posted.
  return { file: JSON.parse(JSON.stringify({ vendors: [{ name: one("Vendor"), apps: [app] }] })) };
}

/** The comment body, marked so the workflow can find and update it on an edit. */
function comment(body) {
  const { file, missing } = build(body);
  if (missing) {
    return `${MARKER}\nNot enough here to build an import file yet. Missing: ${missing.join(", ")}.\n\nEdit the issue to add it and this comment updates.`;
  }
  const json = JSON.stringify(file, null, 2);
  const fence = "`".repeat(Math.max(3, ...(json.match(/`+/g) ?? []).map((run) => run.length + 1)));
  return [
    MARKER,
    "Import file for https://wherethemlogs.app/admin/import - save it as a `.json` file and preview it before applying.",
    "",
    "- If the app is already in the index, `logs` replaces its whole list. The preview shows any stored paths that would be removed.",
    "- The vendor matches by name. A different spelling (\"Microsoft Corporation\" for \"Microsoft\") creates a new vendor and moves the app to it.",
    "",
    `${fence}json`,
    json,
    fence,
  ].join("\n");
}

module.exports = { build, comment, MARKER };

if (require.main === module) {
  const assert = require("node:assert");
  const body = [
    "### Application", "", "Visual Studio Code", "",
    "### Vendor", "", "Microsoft", "",
    "### Also known as", "", "vscode, code", "",
    "### Variant", "", "_No response_", "",
    "### Windows log paths", "", "```text", "%APPDATA%\\Code\\logs\\ | Session logs", "", "```", "",
    "### Windows installer type", "", "- [X] msi", "- [ ] exe", "- [ ] msix", "- [ ] appx", "",
    "### macOS log paths", "", "```text", "~/Library/Containers/com.microsoft.<Word|Excel>/Logs/", "```", "",
    "### macOS installer type", "", "- [ ] pkg", "- [X] dmg", "- [ ] mas", "",
    "### Linux log paths", "", "_No response_", "",
    "### Linux installer type", "", "- [X] deb", "- [ ] rpm", "- [ ] snap", "- [ ] flatpak", "- [ ] appimage", "",
    "### Architecture", "", "- [X] x64", "- [ ] arm64", "- [ ] Not sure", "",
    "### Scope", "", "- [X] per-user", "- [ ] per-machine", "- [ ] system", "- [ ] Not sure", "",
    "### How did you verify this?", "", "My machine, and https://code.visualstudio.com/docs.", "",
    "### Anything else", "", "_No response_", "",
    "### Before you submit", "", "- [X] I have redacted hostnames, usernames, tenant identifiers and customer names.",
  ].join("\r\n");

  assert.deepStrictEqual(build(body).file, {
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
  const twoScopes = build(body.replace("- [ ] per-machine", "- [X] per-machine")).file;
  assert.strictEqual(twoScopes.vendors[0].apps[0].logs[0].scope, undefined);
  assert.deepStrictEqual(build(body.replace("\r\nMicrosoft\r\n", "\r\n_No response_\r\n")).missing, ["the vendor"]);
  assert.deepStrictEqual(
    build(body.replace(/```text[\s\S]*?```/g, "_No response_")).missing,
    ["at least one log path"],
  );
  assert.ok(comment(body).includes("```json\n{"));
  console.log("ok");
}
