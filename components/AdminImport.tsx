"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice, Reading, useWrite } from "./AdminField";
import { IconArrow } from "./Icons";
import { AdminError, IMPORT_MAX_BYTES, importCatalogue, type ImportPlan } from "@/lib/admin";

/**
 * One file out, one file in.
 *
 * Choosing a file only previews it: the server plans it against what is stored
 * and says exactly what would change. Nothing is written until Apply, and Apply
 * plans again on the server instead of trusting this preview.
 */
export function CatalogueTransfer() {
  const router = useRouter();
  const write = useWrite();
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [applied, setApplied] = useState<number | null>(null);

  const choose = (picked: File | undefined) => {
    if (!picked) return;
    setPlan(null);
    setApplied(null);
    void write.run(
      async () => {
        if (picked.size > IMPORT_MAX_BYTES) {
          throw new AdminError(400, "bad_request", `That file is ${(picked.size / 1048576).toFixed(1)} MB. Imports are limited to 5 MB - split it by vendor.`);
        }
        const text = await picked.text();
        setFile({ name: picked.name, text });
        return importCatalogue(text);
      },
      (result) => setPlan(result.plan),
    );
  };

  const apply = () =>
    file &&
    void write.run(
      () => importCatalogue(file.text, true),
      (result) => {
        setPlan(result.plan);
        setApplied(result.applied);
        router.refresh();
      },
    );

  return (
    <>
      <section className="admRecord" aria-label="Export">
        <div className="rackHead admRecord__head">
          <span className="tag mono">Export</span>
          <span className="tag mono admRecord__hint">JSON · vendors &gt; apps &gt; logs</span>
        </div>
        <div className="admRemove">
          <p className="admRemove__p">
            The whole catalogue as one file - every vendor, app and log path, in the format the
            import reads. Importing it back unchanged changes nothing, so it doubles as a backup.
          </p>
          <a className="btn tag mono" href="/api/admin/export" download>
            Download the catalogue
            <IconArrow size={15} />
          </a>
        </div>
      </section>

      <section className="admRecord" aria-label="Import">
        <div className="rackHead admRecord__head">
          <span className="tag mono">Import</span>
          {applied !== null && (
            <Reading>
              Imported · {applied} write{applied === 1 ? "" : "s"}
            </Reading>
          )}
        </div>
        <div className="admRemove">
          <p className="admRemove__p">
            Choosing a file only previews it. Vendors and apps are matched by name, log paths
            by platform and path. A key the file leaves out keeps what is stored; an app&rsquo;s{" "}
            <span className="mono">logs</span> list replaces its paths. Nothing else is
            deleted.
          </p>
          <label className="admUp tag mono">
            <input
              type="file"
              accept=".json,application/json"
              className="sr"
              disabled={write.busy}
              onChange={(e) => {
                choose(e.target.files?.[0]);
                // So choosing the same file again, after editing it, still fires.
                e.target.value = "";
              }}
            />
            {write.busy && !plan ? "Reading…" : file ? "Choose another file" : "Choose a JSON file"}
          </label>
        </div>

        {write.notice && <Notice code="Refused">{write.notice}</Notice>}

        {plan && file && <PlanView plan={plan} fileName={file.name} applied={applied !== null} />}

        {plan && file && applied === null && (
          <div className="admCommit">
            <button
              type="button"
              className="btn tag mono"
              onClick={apply}
              disabled={write.busy || plan.errors.length > 0 || plan.writes === 0}
            >
              {write.busy
                ? "Writing…"
                : plan.writes
                  ? `Apply ${plan.writes} write${plan.writes === 1 ? "" : "s"}`
                  : "Nothing to apply"}
              <IconArrow size={15} />
            </button>
            <p className="tag mono admCommit__note">
              {plan.errors.length
                ? "Fix the problems in the file, then choose it again."
                : plan.writes
                  ? "Nothing has been written yet. Apply checks the file against the store again before writing."
                  : "The file matches what is stored."}
            </p>
          </div>
        )}
      </section>
    </>
  );
}

const tally = (parts: [number, string][]) =>
  parts.filter(([n], i) => n || i === 0).map(([n, what]) => `${n} ${what}`).join(" · ");

function PlanView({ plan, fileName, applied }: { plan: ImportPlan; fileName: string; applied: boolean }) {
  const rows: [string, string][] = [
    ["Vendors", tally([[plan.vendors.create.length, "new"], [plan.vendors.update.length, "changed"], [plan.vendors.unchanged, "unchanged"]])],
    ["Apps", tally([[plan.apps.create.length, "new"], [plan.apps.update.length, "changed"], [plan.apps.move.length, "moved"], [plan.apps.unchanged, "unchanged"]])],
    ["Log paths", tally([[plan.logPaths.create, "new"], [plan.logPaths.update, "changed"], [plan.logPaths.remove, "removed"]])],
  ];

  return (
    <>
      {plan.errors.length > 0 && (
        <div className="admNotice" role="alert">
          <p className="admNotice__code tag mono">Problems · {plan.errors.length}</p>
          <div className="admNotice__body">
            <p className="admNotice__p">Nothing can be written until these are fixed in the file.</p>
            <Lines items={plan.errors} />
          </div>
        </div>
      )}

      <div className="admRemove admPlan">
        <p className="tag mono" style={{ margin: 0 }}>
          {applied ? "Applied" : "Preview"} · <span className="admPlan__file">{fileName}</span>
        </p>
        <dl className="whoami">
          {rows.map(([k, v]) => (
            <Fragment key={k}>
              <dt className="tag mono">{k}</dt>
              <dd className="mono">{v}</dd>
            </Fragment>
          ))}
        </dl>
        <Names label="New vendors" items={plan.vendors.create} />
        <Names label="Changed vendors" items={plan.vendors.update} />
        <Names label="New apps" items={plan.apps.create} />
        <Names label="Changed apps" items={plan.apps.update} />
        <Names label="Moved apps" items={plan.apps.move.map((m) => `${m.name} - from ${m.from} to ${m.to}`)} />
        <Names label="Notes" items={plan.warnings} />
      </div>
    </>
  );
}

function Names({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <details className="admPlan__group" open={items.length <= 8}>
      <summary className="admPlan__sum tag mono">
        {label} · {items.length}
      </summary>
      <Lines items={items} />
    </details>
  );
}

const Lines = ({ items }: { items: string[] }) => (
  <ul className="admPlan__list mono">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);
