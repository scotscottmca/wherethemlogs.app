"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeletePress, Fields, IconField, Notice, Reading, Superseded, Text, useWrite } from "./AdminField";
import { IconArrow } from "./Icons";
import { createVendor, deleteVendor, patchVendor, type Vendor } from "@/lib/admin";
import { slugify } from "@/lib/model";

const WATCH = [
  { key: "name" as const, label: "Name" },
  { key: "slug" as const, label: "Slug" },
  { key: "iconUrl" as const, label: "Icon" },
  { key: "website" as const, label: "Website" },
];

interface Form {
  name: string;
  slug: string;
  iconUrl: string | null;
  website: string;
}

const formOf = (vendor: Vendor | null): Form => ({
  name: vendor?.name ?? "",
  slug: vendor?.slug ?? "",
  iconUrl: vendor?.iconUrl ?? null,
  website: vendor?.website ?? "",
});

/**
 * The vendor record. On this surface a vendor is an aisle, so creating one and
 * editing one are the same object in two states - the fields are open from the
 * moment the page renders, because a curator who navigated here came to type.
 */
export function VendorEditor({ vendor }: { vendor: Vendor | null }) {
  const router = useRouter();
  const write = useWrite();

  const [form, setForm] = useState<Form>(() => formOf(vendor));
  const [slugTouched, setSlugTouched] = useState(Boolean(vendor));
  const [etag, setEtag] = useState<string | undefined>(vendor?._etag);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const slug = slugTouched ? form.slug : slugify(form.name);

  const payload = () => ({
    name: form.name,
    slug,
    iconUrl: form.iconUrl,
    website: form.website,
  });

  const save = (withEtag = etag) =>
    void write.run(
      () =>
        vendor
          ? patchVendor(vendor.id, payload(), withEtag)
          : createVendor(payload()),
      (saved) => {
        setEtag(saved._etag);
        if (vendor) router.refresh();
        else router.push(`/admin/v/${saved.id}`);
      },
    );

  return (
    <section className="admRecord" aria-label={vendor ? "Vendor record" : "New vendor"}>
      <div className="rackHead admRecord__head">
        <span className="tag mono">{vendor ? "Vendor record" : "New vendor"}</span>
        {write.saved && <Reading>Saved {write.saved}</Reading>}
      </div>

      {write.superseded && vendor && (
        <Superseded<Record<string, unknown>>
          url={`/api/admin/vendors/${vendor.id}`}
          mine={{ ...form, slug }}
          watch={WATCH}
          onKeepMine={(fresh) => {
            setEtag(fresh);
            save(fresh);
          }}
          onTakeTheirs={(record, fresh) => {
            setForm(formOf(record as unknown as Vendor));
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
          maxLength={120}
          placeholder="Microsoft"
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
        <IconField
          value={form.iconUrl}
          onChange={(v) => set("iconUrl", v)}
          error={write.fields.iconUrl}
          inherit={{
            label: "No icon",
            note: "Apps under this vendor that inherit will show no icon either.",
            preview: null,
          }}
        />
        <Text
          label="Website"
          mono
          value={form.website}
          onChange={(v) => set("website", v)}
          error={write.fields.website}
          placeholder="https://…"
          hint="Optional. Must be https. Clear the field to remove it."
        />
      </Fields>

      <div className="admCommit">
        <button
          type="button"
          className="btn tag mono"
          onClick={() => save()}
          disabled={write.busy || !form.name.trim()}
        >
          {write.busy ? "Writing…" : vendor ? "Save the vendor" : "Add the vendor"}
          <IconArrow size={15} />
        </button>
        <p className="tag mono admCommit__note">
          {vendor
            ? etag
              ? "Written against the version you loaded. A change underneath is refused, never merged."
              : "This record carries no version tag, so the write applies to whatever is current."
            : "The vendor starts with no apps - add them next."}
        </p>
      </div>
    </section>
  );
}

/**
 * Deleting a vendor is the one operation here that can destroy a lot at once, so
 * the API refuses it while apps are still racked and hands back the manifest.
 * That manifest is the state worth designing: the surface prints what is in the
 * way, links to every one of it, and only then offers the second press.
 */
export function VendorDelete({ vendor, appCount }: { vendor: Vendor; appCount: number }) {
  const router = useRouter();
  const write = useWrite();
  const [held, setHeld] = useState<{ id: string; name: string }[] | null>(null);

  // The manifest outlives the failed write that produced it: the cascade press
  // starts a new write, and the list must still be on screen while it runs.
  useEffect(() => {
    if (write.blocking) setHeld(write.blocking);
  }, [write.blocking]);

  const remove = (cascade: boolean) =>
    void write.run(
      () => deleteVendor(vendor.id, cascade),
      () => {
        router.push("/admin");
        router.refresh();
      },
    );

  const blocking = held;

  return (
    <section className="admRecord" aria-label="Delete this vendor">
      <div className="rackHead admRecord__head">
        <span className="tag mono">Delete this vendor</span>
      </div>

      {blocking ? (
        <div className="admNotice admNotice--wide" role="alert">
          <p className="admNotice__code tag mono">Blocked · {blocking.length} app{blocking.length === 1 ? "" : "s"}</p>
          <div className="admNotice__body">
            <p className="admNotice__p">
              {vendor.name} still owns {blocking.length} app{blocking.length === 1 ? "" : "s"}.
              Move each one to another vendor, or delete the vendor and take them with it -
              log paths are embedded, so their paths go too. Nothing has been deleted yet.
            </p>
            <ul className="admManifest">
              {blocking.map((app) => (
                <li key={app.id}>
                  <Link className="admManifest__row" href={`/admin/v/${vendor.id}/a/${app.id}`}>
                    <span className="admManifest__name">{app.name}</span>
                    <span className="tag mono admManifest__go">
                      Open the record
                      <IconArrow size={13} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="admNotice__acts">
              <button
                type="button"
                className="btn tag mono"
                onClick={() => remove(true)}
                disabled={write.busy}
              >
                {write.busy
                  ? "Deleting…"
                  : `Delete the vendor and all ${blocking.length} app${blocking.length === 1 ? "" : "s"}`}
              </button>
              <button
                type="button"
                className="btn btn--ghost tag mono"
                onClick={() => {
                  setHeld(null);
                  write.clear();
                }}
                disabled={write.busy}
              >
                Keep it
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="admRemove">
          <p className="admRemove__p">
            {appCount
              ? `${vendor.name} owns ${appCount} app${appCount === 1 ? "" : "s"}. The delete will be refused and will print what is in the way before anything is removed.`
              : `${vendor.name} owns no apps. Deleting it removes the vendor record and nothing else.`}
          </p>
          <DeletePress
            what={`“${vendor.name}”`}
            busy={write.busy}
            onDelete={() => remove(false)}
          />
        </div>
      )}

      {write.notice && !blocking && <Notice code="Refused">{write.notice}</Notice>}
    </section>
  );
}
