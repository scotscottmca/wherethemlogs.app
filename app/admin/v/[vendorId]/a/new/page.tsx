import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AisleBand, Aisle, BayHead } from "@/components/AdminChrome";
import { AppRail } from "@/components/AdminRails";
import { AppEditor } from "@/components/AdminApp";
import { vendorRecord, whoAmI } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New app" };

type Ctx = { params: Promise<{ vendorId: string }> };

export default async function NewApp({ params }: Ctx) {
  const { vendorId } = await params;
  const who = await whoAmI();

  const record = await vendorRecord(vendorId);
  if (!record) notFound();

  const { vendor, apps } = record;

  return (
    <>
      <AisleBand
        trail={[
          { label: "Catalogue", href: "/admin" },
          { label: vendor.name, href: `/admin/v/${vendor.id}` },
          { label: "New app" },
        ]}
        who={who?.userDetails ?? null}
      />

      <main className="rack">
        <BayHead
          name="New app"
          back={{ label: vendor.name, href: `/admin/v/${vendor.id}` }}
          facts={`Adding to ${vendor.name} · log paths are added on its own record`}
        />
        <Aisle rail={<AppRail vendorId={vendor.id} vendorName={vendor.name} apps={apps} />}>
          <AppEditor app={null} vendor={vendor} />
        </Aisle>
      </main>
    </>
  );
}
