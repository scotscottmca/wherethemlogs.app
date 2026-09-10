"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeletePress, Field, Fields, IconField, Notice, Reading, Superseded, Text, useWrite } from "./AdminField";
import { IconArrow, IconChevron } from "./Icons";
import { createApp, deleteApp, patchApp, type App, type Vendor } from "@/lib/admin";
import { slugify } from "@/lib/model";

const WATCH = [
  { key: "name" as const, label: "Name" },
  { key: "slug" as const, label: "Slug" },
  { key: "aliases" as const, label: "Aliases" },
  { key: "iconUrl" as const, label: "Icon" },
];

interface Form {
  name: string;
  slug: string;
  aliases: string;
  iconUrl: string | null;
  vendorId: string;
}

const formOf = (app: App | null, vendorId: string): Form => ({
  name: app?.name ?? "",
  slug: app?.slug ?? "",
  aliases: (app?.aliases ?? []).join(", "),
  iconUrl: app?.iconUrl ?? null,
  vendorId: app?.vendorId ?? vendorId,
});

const splitAliases = (value: string) =>
  value.split(",").map((a) => a.trim()).filter(Boolean);

/**
 * The app record — a bay in the vendor's aisle.
 *
 * The icon control is the piece that refuses to flatten: `iconUrl: null` is not
 * an empty field, it is the instruction to inherit the vendor's icon, so the
 * source is a two-state choice and the URL only exists inside one of them.
 */
export function AppEditor({
  app,
  vendor,
  vendors,
}: {
  app: App | null;
  vendor: Vendor;
  /** Every vendor, so an app can be moved between aisles. Edit only. */
  vendors?: Vendor[];
}) {
  const router = useRouter();
  const write = useWrite();

  const [form, setForm] = useState<Form>(() => formOf(app, vendor.id));
  const [slugTouched, setSlugTouched] = useState(Boolean(app));
  const [etag, setEtag] = useState<string | undefined>(app?._etag);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const slug = slugTouched ? form.slug : slugify(form.name);
  const moving = Boolean(app) && form.vendorId !== vendor.id;

  const save = (withEtag = etag) =>
    void write.run(
      () => {
        const body = {
          name: form.name,
          slug,
          aliases: splitAliases(form.aliases),
          iconUrl: form.iconUrl,
          ...(app ? { vendorId: form.vendorId } : { vendorId: vendor.id }),
        };
        return app ? patchApp(app.id, vendor.id, body, withEtag) : createApp(body);
      },
      (saved) => {
        setEtag(saved._etag);
        if (!app) router.push(`/admin/v/${saved.vendorId}/a/${saved.id}`);
        else if (saved.vendorId !== vendor.id)
          router.replace(`/admin/v/${saved.vendorId}/a/${saved.id}`);
        else router.refresh();
      },
    );

  return (
    <section className="admRecord" aria-label={app ? "App record" : "New app"}>
      <div className="rackHead admRecord__head">
        <span className="tag mono">{app ? "App record" : `New app in ${vendor.name}`}</span>
        {write.saved && <Reading>Saved {write.saved}</Reading>}
      </div>

      {write.superseded && app && (
        <Superseded<Record<string, unknown>>
          url={`/api/admin/apps/${app.id}?vendorId=${encodeURIComponent(vendor.id)}`}
          mine={{ ...form, slug, aliases: splitAliases(form.aliases).join(", ") }}
          watch={WATCH}
          onKeepMine={(fresh) => {
            setEtag(fresh);
            save(fresh);
          }}
          onTakeTheirs={(record, fresh) => {
            setForm(formOf(record as unknown as App, vendor.id));
            setSlugTouched(true);
            setEtag(fresh);
            write.clear();
          }}
        />
      )}

      {write.notice && !write.superseded && <Notice code="Refused">{write.notice}</Notice>}

      <Fields>
        <Text
          label="Name"
          value={form.name}
          onChange={(v) => set("name", v)}
          error={write.fields.name}
          maxLength={160}
          placeholder="Microsoft Teams"
        />
        <Text
          label="Slug"
          mono
          value={slug}
          onChange={(v) => {
            setSlugTouched(true);
            set("slug", v);
          }}
          error={write.fields.slug}
          maxLength={80}
          hint={
            slugTouched
              ? "Lowercase letters, digits and hyphens. Unique across the whole catalogue."
              : "Derived from the name. Type here to set it yourself."
          }
        />
        <Text
          label="Aliases"
          mono
          value={form.aliases}
          onChange={(v) => set("aliases", v)}
          error={write.fields.aliases}
          placeholder="teams, msteams"
          hint="Comma separated. What someone might type instead of the name — the search matches on these too."
        />
        <IconField
          value={form.iconUrl}
          onChange={(v) => set("iconUrl", v)}
          error={write.fields.iconUrl}
          inherit={{
            label: `Inherit ${vendor.name}`,
            note: vendor.iconUrl
              ? `Stored as null. The plate shows ${vendor.name}'s icon, and follows it if the vendor's changes.`
              : `Stored as null. ${vendor.name} carries no icon either, so the plate shows none — give the vendor one and this app picks it up.`,
            preview: vendor.iconUrl,
          }}
        />

        {app && vendors && (
          <Field
            label="Vendor"
            error={write.fields.vendorId}
            hint={
              moving
                ? "Moving an app changes its partition, so the API recreates it under the new vendor and deletes the old copy. It keeps its id, its slug and all its log paths."
                : "The aisle this app is racked in."
            }
          >
            <span className="admSelectWrap">
              <select
                className="frow__in admSelect mono"
                value={form.vendorId}
                onChange={(e) => set("vendorId", e.target.value)}
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <IconChevron size={14} className="admSelectWrap__mark" />
            </span>
          </Field>
        )}
      </Fields>

      <div className="admCommit">
        <button
          type="button"
          className="btn tag mono"
          onClick={() => save()}
          disabled={write.busy || !form.name.trim()}
        >
          {write.busy ? "Writing…" : moving ? "Move and save the app" : app ? "Save the app" : "Rack the app"}
          <IconArrow size={15} />
        </button>
        <p className="tag mono admCommit__note">
          {app
            ? "Log paths are written separately — this saves the record, not the paths beneath it."
            : "The app is racked with no log paths. You add those on its own record, next."}
        </p>
      </div>
    </section>
  );
}

export function AppDelete({ app, vendorId }: { app: App; vendorId: string }) {
  const router = useRouter();
  const write = useWrite();

  return (
    <section className="admRecord" aria-label="Delete this app">
      <div className="rackHead admRecord__head">
        <span className="tag mono">Remove the bay</span>
      </div>
      <div className="admRemove">
        <p className="admRemove__p">
          Log paths are embedded on the app document, so deleting {app.name} deletes its{" "}
          {app.logPaths.length} log path{app.logPaths.length === 1 ? "" : "s"} with it. No
          orphan is possible, and nothing else references it.
        </p>
        <DeletePress
          what={`“${app.name}”`}
          busy={write.busy}
          onDelete={() =>
            void write.run(
              () => deleteApp(app.id, vendorId),
              () => {
                router.push(`/admin/v/${vendorId}`);
                router.refresh();
              },
            )
          }
        />
      </div>
      {write.notice && <Notice code="Refused">{write.notice}</Notice>}
    </section>
  );
}
