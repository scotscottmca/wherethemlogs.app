import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AisleBand, Aisle, BayHead, ZoneTags } from "@/components/AdminChrome";
import { AppRail } from "@/components/AdminRails";
import { AppDelete, AppEditor } from "@/components/AdminApp";
import { LogPathStack } from "@/components/AdminLogPaths";
import { aisle, appRecord, vendorRecord, whoAmI, type AisleVendor } from "@/lib/server/admin";
import type { Platform } from "@/lib/model";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ vendorId: string; appId: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { vendorId, appId } = await params;
  const record = await appRecord(vendorId, appId).catch(() => null);
  return { title: record ? record.app.name : "App" };
}

export default async function AppPage({ params }: Ctx) {
  const { vendorId, appId } = await params;
  const who = await whoAmI();

  const record = await appRecord(vendorId, appId);
  if (!record) notFound();

  const { vendor, app } = record;

  // The rail needs this vendor's other bays; the editor needs every vendor, so
  // the app can be moved to one of them.
  const siblings = (await vendorRecord(vendorId))?.apps ?? [];
  let vendors: AisleVendor[] = [];
  try {
    vendors = await aisle();
  } catch {
    // Without the list the record still edits; only the move control goes away.
  }

  const platforms = [...new Set(app.logPaths.map((p) => p.platform))] as Platform[];

  return (
    <>
      <AisleBand
        trail={[
          { label: "Stock control", href: "/admin" },
          { label: vendor.name, href: `/admin/v/${vendor.id}` },
          { label: app.name },
        ]}
        who={who?.userDetails ?? null}
      />

      <main className="rack">
        <BayHead
          name={app.name}
          back={{ label: vendor.name, href: `/admin/v/${vendor.id}` }}
          facts={
            <>
              {app.slug} · {String(app.logPaths.length).padStart(2, "0")} log path
              {app.logPaths.length === 1 ? "" : "s"} · updated{" "}
              {app.updatedAt ? app.updatedAt.slice(0, 10) : "—"}
            </>
          }
          actions={<ZoneTags platforms={platforms} />}
        />

        <Aisle
          rail={
            <AppRail
              vendorId={vendor.id}
              vendorName={vendor.name}
              apps={siblings}
              currentId={app.id}
            />
          }
        >
          <AppEditor app={app} vendor={vendor} vendors={vendors.length ? vendors : undefined} />
          <LogPathStack app={app} vendorId={vendor.id} />
          <AppDelete app={app} vendorId={vendor.id} />
        </Aisle>
      </main>
    </>
  );
}
