"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IconCheck, IconClose, IconCorner, IconFlag } from "./Icons";
import { AdminError, ICON_MAX_BYTES, ICON_TYPES, reread, uploadIcon } from "@/lib/admin";

/**
 * The field family.
 *
 * A form here is a label plate that has not been printed yet, so a field row is
 * the path row with an input where the path goes: stencilled label cell on the
 * left, value on the right, one shared vertical rule down the stack. The cell
 * takes the focus ring the way the scanner bar does — the input itself never
 * draws a box, because nothing in this world does.
 */

/* --- Rows ----------------------------------------------------------------- */

export function Fields({ children }: { children: React.ReactNode }) {
  return <div className="fields">{children}</div>;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="frow" data-bad={error ? "true" : undefined}>
      <label className="tag mono frow__label" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="frow__cell">
        {children}
        {hint && <p className="frow__hint mono">{hint}</p>}
        {error && (
          <p className="frow__bad mono" role="alert">
            <span className="frow__badTag">Rejected</span>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function Text({
  label,
  value,
  onChange,
  hint,
  error,
  mono = false,
  placeholder,
  maxLength,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: React.ReactNode;
  error?: string;
  /** Machine-true content — slugs, ids, paths, urls — is set in the mono voice. */
  mono?: boolean;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
}) {
  const id = useId();
  const shared = {
    id,
    value,
    placeholder,
    maxLength,
    "aria-invalid": error ? (true as const) : undefined,
    className: `frow__in${mono ? " mono" : ""}`,
    spellCheck: !mono,
    autoComplete: "off" as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
  };

  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      {multiline ? (
        <textarea {...shared} rows={2} />
      ) : (
        <input
          {...shared}
          type="text"
          autoCapitalize={mono ? "off" : undefined}
          autoCorrect={mono ? "off" : undefined}
        />
      )}
    </Field>
  );
}

/**
 * A set of pressed cells, the same control the results rail filters with. Used
 * for anything with a closed list of answers: platform, scope, installer types,
 * and the two-state icon source.
 */
export function Toggles<T extends string>({
  label,
  options,
  value,
  onChange,
  hint,
  error,
  multi = false,
}: {
  label: string;
  options: { id: T; label: React.ReactNode }[];
  value: T[];
  onChange: (next: T[]) => void;
  hint?: React.ReactNode;
  error?: string;
  multi?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <div className="frow__set">
        {options.map((option) => {
          const on = value.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              className="tog tag mono"
              aria-pressed={on}
              onClick={() =>
                onChange(
                  multi
                    ? on
                      ? value.filter((v) => v !== option.id)
                      : [...value, option.id]
                    : [option.id],
                )
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/* --- State printed in place ----------------------------------------------- */

/** The confirmed reading, in the plate's own voice. Never a toast. */
export function Reading({ children }: { children: React.ReactNode }) {
  return (
    <span className="admRead mono" role="status">
      <IconCheck size={13} />
      {children}
    </span>
  );
}

/**
 * Label stock over painted steel: the surface's attention state. Cyan means
 * confirmed, bone means read this — colour never carries it alone, the block
 * always prints a word.
 */
export function Notice({
  code,
  children,
  actions,
}: {
  code: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="admNotice" role="alert">
      <p className="admNotice__code tag mono">{code}</p>
      <div className="admNotice__body">
        <p className="admNotice__p">{children}</p>
        {actions && <div className="admNotice__acts">{actions}</div>}
      </div>
    </div>
  );
}

/* --- Writing -------------------------------------------------------------- */

export interface WriteState {
  busy: boolean;
  /** A failure that names no single field. */
  notice: string | null;
  /** Failures printed against the row they belong to. */
  fields: Record<string, string>;
  /** The record moved under us; the write was refused, not applied. */
  superseded: boolean;
  /** A vendor delete refused because these apps are still racked. */
  blocking: { id: string; name: string }[] | null;
  saved: string | null;
}

const BLANK: WriteState = {
  busy: false,
  notice: null,
  fields: {},
  superseded: false,
  blocking: null,
  saved: null,
};

const stamp = () =>
  new Date().toLocaleTimeString(undefined, { hour12: false }).padStart(8, "0");

/**
 * One write, its outcome, and where the outcome prints. Shared by all three
 * editors because the recovery — a named field, a 412, a 409 manifest — is the
 * same shape whatever record is being written.
 */
export function useWrite() {
  const [state, setState] = useState<WriteState>(BLANK);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const clear = useCallback(() => setState(BLANK), []);

  const run = useCallback(
    async <T,>(job: () => Promise<T>, after?: (result: T) => void): Promise<void> => {
      setState({ ...BLANK, busy: true });
      try {
        const result = await job();
        if (!alive.current) return;
        setState({ ...BLANK, saved: stamp() });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => alive.current && setState(BLANK), 4000);
        after?.(result);
      } catch (err) {
        if (!alive.current) return;
        if (err instanceof AdminError) {
          const field = err.field;
          setState({
            ...BLANK,
            notice: field ? null : err.message,
            fields: field ? { [field]: err.message } : {},
            superseded: err.superseded,
            blocking: err.blocking,
          });
          return;
        }
        setState({
          ...BLANK,
          notice: "The write did not reach the store. Nothing was saved — check the connection and press again.",
        });
      }
    },
    [],
  );

  return { ...state, run, clear, setState };
}

/* --- The 412 recovery ------------------------------------------------------ */

/**
 * Someone else wrote this record between the load and the save. Cosmos refused
 * the write, so nothing was clobbered — but the editor is now holding a version
 * that no longer exists. Rather than swallow that, the surface re-reads, names
 * the fields that moved, and lets the curator decide whose value survives. Their
 * typing is never thrown away without being shown first.
 */
export function Superseded<T extends Record<string, unknown>>({
  url,
  mine,
  watch,
  pick,
  onKeepMine,
  onTakeTheirs,
}: {
  url: string;
  /** The values currently in the form. */
  mine: T;
  /** The fields worth comparing, in the order they appear in the form. */
  watch: { key: keyof T & string; label: string }[];
  /**
   * Narrows the re-read document to the part this form owns. A log path lives
   * inside its app, so the app comes back and the row is picked out of it;
   * returning null means someone deleted it while this edit was open.
   */
  pick?: (raw: unknown) => T | null;
  onKeepMine: (etag: string | undefined) => void;
  onTakeTheirs: (record: T, etag: string | undefined) => void;
}) {
  const [theirs, setTheirs] = useState<{ record: T | null; etag: string | undefined } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    reread<unknown>(url)
      .then(({ record, etag }) => {
        if (live) setTheirs({ record: pick ? pick(record) : (record as T), etag });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // `pick` is a fresh closure each render; the URL is what identifies the read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (failed) {
    return (
      <Notice code="Superseded">
        This record changed since you loaded it, and the current version could not be read
        back. Nothing was written. Reload the page and reapply your edit.
      </Notice>
    );
  }

  if (!theirs) {
    return (
      <Notice code="Superseded">
        This record changed since you loaded it, so the write was refused — nothing was
        clobbered. Reading the current version…
      </Notice>
    );
  }

  if (!theirs.record) {
    return (
      <Notice
        code="Gone"
        actions={
          <button type="button" className="btn tag mono" onClick={() => onKeepMine(theirs.etag)}>
            Write it back
          </button>
        }
      >
        Someone deleted this record while you had it open, so there was nothing left to
        write to. Your typing is still here — writing it back re-creates the record as you
        have it.
      </Notice>
    );
  }

  const record = theirs.record;
  const moved = watch.filter(({ key }) => String(record[key] ?? "") !== String(mine[key] ?? ""));

  return (
    <div className="admNotice admNotice--wide" role="alert">
      <p className="admNotice__code tag mono">Superseded</p>
      <div className="admNotice__body">
        <p className="admNotice__p">
          Someone else wrote this record after you loaded it, so Cosmos refused your write —
          nothing was clobbered and nothing was lost. Here is where the two versions differ.
        </p>

        {moved.length ? (
          <table className="admDiff mono">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">In the store now</th>
                <th scope="col">Yours</th>
              </tr>
            </thead>
            <tbody>
              {moved.map(({ key, label }) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{String(record[key] ?? "") || "—"}</td>
                  <td>{String(mine[key] ?? "") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admNotice__p">
            None of the fields you can edit here differ — the other write touched something
            else on the record. Taking the current version is safe.
          </p>
        )}

        <div className="admNotice__acts">
          <button type="button" className="btn tag mono" onClick={() => onKeepMine(theirs.etag)}>
            Keep mine, save over theirs
          </button>
          <button
            type="button"
            className="btn btn--ghost tag mono"
            onClick={() => onTakeTheirs(record, theirs.etag)}
          >
            <IconCorner size={14} />
            Take theirs, discard mine
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Deleting -------------------------------------------------------------- */

/**
 * Two presses, in place. The first arms the control and prints what the second
 * one will do; it disarms itself after eight seconds. No dialog — nothing in
 * this world floats over the page.
 */
export function DeletePress({
  what,
  busy = false,
  onDelete,
}: {
  what: string;
  busy?: boolean;
  onDelete: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const arm = () => {
    setArmed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setArmed(false), 8000);
  };

  if (!armed) {
    return (
      <button type="button" className="admDel tag mono" onClick={arm} disabled={busy}>
        <IconFlag size={13} />
        Delete {what}
      </button>
    );
  }

  return (
    <span className="admDel__armed">
      <button
        type="button"
        className="admDel admDel--go tag mono"
        onClick={onDelete}
        disabled={busy}
        autoFocus
      >
        {busy ? "Deleting…" : `Press again to delete ${what}`}
      </button>
      <button
        type="button"
        className="admDel tag mono"
        onClick={() => setArmed(false)}
        disabled={busy}
      >
        <IconClose size={13} />
        Keep it
      </button>
    </span>
  );
}

/* --- Icons ----------------------------------------------------------------- */

/**
 * An icon has two states that must never collapse into one another: a record
 * carries its own icon, or it does not. On an app, "does not" is not an empty
 * field — it is the instruction to inherit the vendor's, which is what
 * `iconUrl: null` means in the store. So the source is chosen first and the URL
 * only exists inside one of the two answers.
 */
export function IconField({
  value,
  onChange,
  error,
  inherit,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  error?: string;
  /** What `null` means for this record, and what it would show. */
  inherit: { label: string; note: string; preview: string | null };
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const own = value !== null;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { url } = await uploadIcon(file);
      onChange(url);
    } catch (err) {
      setUploadError(
        err instanceof AdminError
          ? err.message.replace(/^"iconUrl" — /, "")
          : "The upload did not reach the store. Try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Field label="Icon source" error={error}>
        <div className="frow__set">
          <button
            type="button"
            className="tog tag mono"
            aria-pressed={!own}
            onClick={() => onChange(null)}
          >
            {inherit.label}
          </button>
          <button
            type="button"
            className="tog tag mono"
            aria-pressed={own}
            onClick={() => onChange(value ?? "")}
          >
            Its own icon
          </button>
        </div>
        <p className="frow__hint mono">
          {own
            ? "Stored on this record. Replacing an icon uploads a new blob and repoints — the old one is not collected."
            : inherit.note}
        </p>
      </Field>

      {own ? (
        <Field label="Icon URL" error={uploadError ?? undefined}>
          <div className="admIcon">
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="admIcon__img" src={value} alt="" width={34} height={34} />
            ) : (
              <span className="admIcon__img admIcon__img--empty" aria-hidden />
            )}
            <input
              type="text"
              className="frow__in mono"
              value={value ?? ""}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="https://…"
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
          <label className="admUp tag mono">
            <input
              type="file"
              className="sr"
              accept={ICON_TYPES.join(",")}
              disabled={uploading}
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {uploading ? "Uploading…" : "Upload a file"}
          </label>
          <p className="frow__hint mono">
            {value ? "" : "Nothing uploaded yet. "}SVG, PNG, WebP or JPEG, up to{" "}
            {ICON_MAX_BYTES / 1024} KB. The upload returns the URL and writes it here; the
            record is only changed when you save.
          </p>
        </Field>
      ) : (
        inherit.preview && (
          <Field label="Inherited">
            <div className="admIcon">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="admIcon__img" src={inherit.preview} alt="" width={34} height={34} />
              <span className="frow__hint mono" style={{ margin: 0 }}>
                {inherit.preview}
              </span>
            </div>
          </Field>
        )
      )}
    </>
  );
}
