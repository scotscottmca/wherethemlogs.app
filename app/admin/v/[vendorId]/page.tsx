import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AisleBand, Aisle, BayHead, ZoneTags } from "@/components/AdminChrome";
import { VendorRail } from "@/components/AdminRails";
import { VendorDelete, VendorEditor } from "@/components/AdminVendor";
import { IconPlus } from "@/components/Icons";
import { aisle, vendorRecord, whoAmI, type AisleVendor } from "@/lib/server/admin";
import type { Platform } from "@/lib/model";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ vendorId: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { vendorId } = await params;
  const record = await vendorRecord(vendorId).catch(() => null);
  return { title: record ? record.vendor.name : "Vendor" };
}

export default async function VendorPage({ params }: Ctx) {
  const { vendorId } = await params;
  const who = await whoAmI();

  const record = await vendorRecord(vendorId);
  if (!record) notFound();

  let vendors: AisleVendor[] = [];
  try {
    vendors = await aisle();
  } catch {
    // The rail is context, not the task.
  }

  const { vendor, apps } = record;
  const logPaths = apps.reduce((n, a) => n + a.logPaths.length, 0);

  return (
    <>
      <AisleBand
        trail={[{ label: "Catalogue", href: "/admin" }, { label: vendor.name }]}
        who={who?.userDetails ?? null}
      />

      <main className="rack">
        <BayHead
          name={vendor.name}
          back={{ label: "Catalogue", href: "/admin" }}
          facts={
            <>
              {vendor.slug} · {String(apps.length).padStart(2, "0")} app
              {apps.length === 1 ? "" : "s"} · {String(logPaths).padStart(3, "0")} log path
              {logPaths === 1 ? "" : "s"}
            </>
          }
        />

        <Aisle rail={<VendorRail vendors={vendors} currentId={vendor.id} />}>
          <VendorEditor vendor={vendor} />

          <section className="admRecord" aria-label="Apps from this vendor">
            <div className="rackHead admRecord__head">
              <span className="tag mono">
                Apps · {String(apps.length).padStart(2, "0")}
              </span>
              <span className="tag mono admRecord__hint">
                An app with no log path never appears in a result
              </span>
            </div>

            {apps.length ? (
              <div className="admStock admStock--bays">
                {apps.map((app) => {
                  const platforms = [...new Set(app.logPaths.map((p) => p.platform))] as Platform[];
                  return (
                    <Link
                      key={app.id}
                      className="admStock__row"
                      href={`/admin/v/${vendor.id}/a/${app.id}`}
                    >
                      <span className="admStock__name">{app.name}</span>
                      <span className="mono admStock__slug">{app.slug}</span>
                      <ZoneTags platforms={platforms} />
                      <span className="tag mono admStock__count">
                        {String(app.logPaths.length).padStart(2, "0")} paths
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="void" style={{ paddingInline: "clamp(0.9rem, 1.6vw, 1.25rem)" }}>
                <h3 className="void__h">No apps yet</h3>
                <p className="void__p">
                  {vendor.name} has no apps yet. Add the first one - it
                  arrives with no log paths, which you type onto its own record.
                </p>
              </div>
            )}

            <Link href={`/admin/v/${vendor.id}/a/new`} className="admAdd tag mono">
              <IconPlus size={16} />
              Add an app to {vendor.name}
            </Link>
          </section>

          <VendorDelete vendor={vendor} appCount={apps.length} />
        </Aisle>
      </main>
    </>
  );
}
