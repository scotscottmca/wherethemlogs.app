"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DeletePress, Field, Fields, Notice, Reading, Superseded, Text, Toggles, stamp, useWrite } from "./AdminField";
import { ZoneSwatch } from "./Chrome";
import { IconArrow, IconPlus } from "./Icons";
import { PLATFORM_META, TYPE_GROUPS, type Platform } from "@/lib/api";
import { SCOPES, pathLines, type Scope } from "@/lib/model";
import { createLogPath, deleteLogPath, patchLogPath, type App, type LogPath } from "@/lib/admin";

const ZONE_CODE: Record<Platform, string> = { windows: "WIN", macos: "MAC", linux: "LNX" };
const ARCH = new Set(["x86", "x64", "arm64"]);

const WATCH = [
  { key: "platform" as const, label: "Platform" },
  { key: "label" as const, label: "Label" },
  { key: "path" as const, label: "Path" },
  { key: "note" as const, label: "Note" },
  { key: "variant" as const, label: "Variant" },
  { key: "types" as const, label: "Types" },
  { key: "scope" as const, label: "Scope" },
];

interface Form {
  platform: Platform;
  label: string;
  path: string;
  note: string;
  variant: string;
  types: string[];
  /** Blank is "unknown": nobody has confirmed whose profile the path lives under. */
  scope: Scope | "";
}

const formOf = (logPath: LogPath | null): Form => ({
  platform: logPath?.platform ?? "windows",
  label: logPath?.label ?? "",
  path: logPath?.path ?? "",
  note: logPath?.note ?? "",
  variant: logPath?.variant ?? "",
  types: logPath?.types ?? [],
  scope: logPath?.scope ?? "",
});

const comparable = (form: Form) => ({
  platform: form.platform,
  label: form.label,
  path: form.path,
  note: form.note,
  variant: form.variant,
  types: [...form.types].sort().join(" "),
  scope: form.scope,
});

/**
 * The log path stack.
 *
 * Paths are embedded on the app, so every write here is a guarded
 * read-modify-write of the whole app document and every response hands back a
 * new tag for the next one. The stack holds that tag, which is why an edit to
 * one path can be refused because a colleague touched a different path on the
 * same app - that is the record moving underneath, and the surface says so.
 */
export function LogPathStack({ app, vendorId }: { app: App; vendorId: string }) {
  const router = useRouter();
  const [etag, setEtag] = useState<string | undefined>(app._etag);
  const [open, setOpen] = useState<string | null>(null);
  // Printed here, not in the editor: the editor closes on save, which would
  // take the confirmation with it.
  const [saved, setSaved] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const opener = useRef<string | null>(null);

  // An editor replaces the control that opened it. When it closes, focus goes
  // back to that control rather than falling to the top of the document.
  useEffect(() => {
    if (open !== null || !opener.current) return;
    root.current?.querySelector<HTMLElement>(`[data-edit="${opener.current}"]`)?.focus();
    opener.current = null;
  }, [open]);

  const show = (id: string) => {
    opener.current = id;
    setOpen(id);
  };

  const done = (nextEtag: string | undefined) => {
    setEtag(nextEtag);
    setSaved(stamp());
    setOpen(null);
    router.refresh();
  };

  return (
    <section className="admRecord" aria-label="Log paths" ref={root}>
      <div className="rackHead admRecord__head">
        <h2 className="tag mono">
          Log paths · {String(app.logPaths.length).padStart(2, "0")}
        </h2>
        <span className="tag mono admRecord__hint">
          Stored byte for byte - variables are never expanded
        </span>
        <Reading>{saved && `Saved ${saved}`}</Reading>
      </div>

      {app.logPaths.length ? (
        <div className="admPaths">
          {app.logPaths.map((logPath, i) =>
            open === logPath.id ? (
              <LogPathEditor
                key={logPath.id}
                app={app}
                vendorId={vendorId}
                logPath={logPath}
                etag={etag}
                onDone={done}
                onCancel={() => setOpen(null)}
              />
            ) : (
              <LogPathRow
                key={logPath.id}
                logPath={logPath}
                index={i}
                onEdit={() => show(logPath.id)}
              />
            ),
          )}
        </div>
      ) : (
        <div className="void" style={{ paddingInline: "clamp(0.9rem, 1.6vw, 1.25rem)" }}>
          <h3 className="void__h">No log paths yet</h3>
          <p className="void__p">
            {app.name} has no log paths, so it never appears in a result.
            Add the first one - platform, what the file is, and the path exactly as the
            machine writes it.
          </p>
        </div>
      )}

      {open === "new" ? (
        <LogPathEditor
          app={app}
          vendorId={vendorId}
          logPath={null}
          etag={etag}
          onDone={done}
          onCancel={() => setOpen(null)}
        />
      ) : (
        <button type="button" className="admAdd tag mono" data-edit="new" onClick={() => show("new")}>
          <IconPlus size={16} />
          Add a log path
        </button>
      )}
    </section>
  );
}

/** A racked path, printed the way the public plate prints it. */
function LogPathRow({
  logPath,
  index,
  onEdit,
}: {
  logPath: LogPath;
  index: number;
  onEdit: () => void;
}) {
  return (
    <article className="plate admPath rack-in" style={{ ["--i" as string]: index }}>
      <div className="plate__zone" data-zone={logPath.platform}>
        <span className="plate__zoneCode">{ZONE_CODE[logPath.platform]}</span>
      </div>
      <div className="plate__body">
        <div className="plate__top">
          <h3 className="plate__name">{logPath.label}</h3>
          {logPath.variant && <span className="tag mono plate__variant">{logPath.variant}</span>}
          <button
            type="button"
            className="admPath__edit tag mono"
            data-edit={logPath.id}
            aria-label={`Edit ${logPath.label}`}
            onClick={onEdit}
          >
            Edit this path
            <IconArrow size={13} />
          </button>
        </div>

        <div className="plate__paths">
          <div className="prow admPath__row">
            <code className="prow__path">
              {logPath.path}
              {logPath.note && <span className="prow__note">- {logPath.note}</span>}
            </code>
          </div>
        </div>

        <div className="plate__foot">
          <div className="chips">
            {logPath.types.map((t) => (
              <span key={t} className={`chip tag mono${ARCH.has(t) ? " chip--arch" : ""}`}>
                {t}
              </span>
            ))}
            {logPath.scope && <span className="chip tag mono chip--scope">{logPath.scope}</span>}
          </div>
          <span className="tag mono admPath__len">{logPath.path.length} chars</span>
        </div>
      </div>
    </article>
  );
}

/**
 * The same plate, before it is printed. The zone band tracks the platform being
 * chosen, and the path prints itself back beneath the field at full contrast so
 * a curator can read exactly what will be stored - including the trailing space
 * the validator is about to remove.
 */
function LogPathEditor({
  app,
  vendorId,
  logPath,
  etag,
  onDone,
  onCancel,
}: {
  app: App;
  vendorId: string;
  logPath: LogPath | null;
  etag: string | undefined;
  onDone: (etag: string | undefined) => void;
  onCancel: () => void;
}) {
  const write = useWrite();
  const [form, setForm] = useState<Form>(() => formOf(logPath));
  const root = useRef<HTMLElement>(null);

  // The editor took the place of the button that opened it; start typing here.
  useEffect(() => {
    root.current?.querySelector<HTMLElement>(".fields input, .fields textarea, .fields button")?.focus();
  }, []);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const lines = pathLines(form.path);
  const stored = lines.join("\n");
  const trimmed = form.path !== stored;

  const save = (withEtag = etag) =>
    void write.run(
      () => {
        const body = {
          platform: form.platform,
          label: form.label,
          path: form.path,
          note: form.note,
          variant: form.variant,
          types: form.types,
          // Null clears a stored scope; an absent key would leave it alone.
          scope: form.scope || null,
        };
        return logPath
          ? patchLogPath(app.id, vendorId, logPath.id, body, withEtag)
          : createLogPath(app.id, vendorId, body, withEtag);
      },
      (result) => onDone(result.app._etag),
    );

  return (
    <article className="plate admPath admPath--edit" ref={root} aria-busy={write.busy}>
      <div className="plate__zone" data-zone={form.platform}>
        <span className="plate__zoneCode">{ZONE_CODE[form.platform]}</span>
      </div>

      <div className="plate__body">
        <div className="admPath__head">
          <span className="tag mono">{logPath ? "Editing this path" : "New log path"}</span>
        </div>

        {write.superseded && (
          <Superseded<Record<string, unknown>>
            url={`/api/admin/apps/${app.id}?vendorId=${encodeURIComponent(vendorId)}`}
            mine={comparable(form)}
            watch={WATCH}
            pick={(raw) => {
              const fresh = (raw as App).logPaths.find((p) => p.id === logPath?.id);
              return fresh ? comparable(formOf(fresh)) : null;
            }}
            onKeepMine={(fresh) => save(fresh)}
            // Taking theirs closes the editor on the version that is actually in
            // the store; the row beneath re-renders as the other write left it.
            onTakeTheirs={(_record, fresh) => onDone(fresh)}
          />
        )}

        {write.notice && !write.superseded && <Notice code="Refused">{write.notice}</Notice>}

        <Fields>
          <Toggles<Platform>
            label="Platform"
            value={[form.platform]}
            onChange={([p]) => p && set("platform", p)}
            error={write.fields.platform}
            options={PLATFORM_META.map((m) => ({
              id: m.id,
              label: (
                <>
                  <ZoneSwatch zone={m.id} size={10} />
                  {m.name}
                </>
              ),
            }))}
          />

          <Text
            label="Label"
            value={form.label}
            onChange={(v) => set("label", v)}
            error={write.fields.label}
            maxLength={80}
            placeholder="Client logs"
            required
            hint="Required. What the file is, in the words a person would use. It heads the entry."
          />

          <Field
            label="Path"
            error={write.fields.path}
            hint="Required. One path per line - list several files under this label by putting each on its own line. Up to 4096 characters, stored exactly as typed. %LOCALAPPDATA%, ~/Library/Logs and $XDG_STATE_HOME are never expanded."
          >
            {({ id, describedBy }) => (
              <>
                <textarea
                  id={id}
                  aria-describedby={describedBy}
                  aria-required
                  className="frow__in mono"
                  value={form.path}
                  rows={Math.min(Math.max(lines.length, 1) + 1, 14)}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  maxLength={4096}
                  placeholder={"%LOCALAPPDATA%\\Vendor\\App\\logs\\"}
                  onChange={(e) => set("path", e.target.value)}
                  aria-invalid={write.fields.path ? true : undefined}
                />
                {stored && (
                  <div className="admProof">
                    <p className="admProof__code tag mono">Stored as</p>
                    <code className="prow__path">{stored}</code>
                    <p className="tag mono admProof__len">
                      {lines.length > 1 && `${lines.length} paths · `}
                      {stored.length} characters
                      {trimmed && " · spaces at the edges of each line and blank lines are dropped on save"}
                    </p>
                  </div>
                )}
              </>
            )}
          </Field>

          <Text
            label="Note"
            value={form.note}
            onChange={(v) => set("note", v)}
            error={write.fields.note}
            maxLength={500}
            multiline
            placeholder="Only written when the app is started with --enable-logging"
            hint="Optional. Prints under the path in small type."
          />

          <Text
            label="Variant"
            mono
            value={form.variant}
            onChange={(v) => set("variant", v)}
            error={write.fields.variant}
            maxLength={80}
            placeholder="Classic (v1)"
            hint="Optional. Splits this path onto its own card - the same path twice on one platform is a duplicate, not a variant."
          />

          {TYPE_GROUPS.map((group) => (
            <Toggles
              key={group.label}
              label={group.label}
              multi
              value={form.types}
              onChange={(next) => set("types", next)}
              error={group.label === "Installer" ? write.fields.types : undefined}
              options={group.types.map((t) => ({ id: t, label: t }))}
              hint={
                group.label === "Installer"
                  ? "Which packagings write to this path. Filters stack, so every tag you set must be true of the path."
                  : undefined
              }
            />
          ))}

          <Toggles<Scope | "">
            label="Scope"
            value={[form.scope]}
            onChange={([s]) => s !== undefined && set("scope", s)}
            error={write.fields.scope}
            options={[...SCOPES.map((s) => ({ id: s, label: s })), { id: "" as const, label: "unknown" }]}
            hint="Unknown prints no scope on the public page. Imports leave it unknown unless the file says."
          />
        </Fields>

        <div className="admCommit">
          <button
            type="button"
            className="btn tag mono"
            onClick={() => save()}
            disabled={write.busy || !form.label.trim() || !form.path.trim()}
          >
            {write.busy ? "Writing…" : logPath ? "Save this path" : "Add this path"}
            <IconArrow size={15} />
          </button>
          <button type="button" className="btn btn--ghost tag mono" onClick={onCancel} disabled={write.busy}>
            Cancel
          </button>
          {logPath && (
            <DeletePress
              what="this path"
              busy={write.busy}
              onDelete={() =>
                void write.run(
                  () => deleteLogPath(app.id, vendorId, logPath.id, etag),
                  (result) => onDone(result.app._etag),
                )
              }
            />
          )}
        </div>
      </div>
    </article>
  );
}
