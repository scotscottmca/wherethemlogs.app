import type { Metadata } from "next";
import { AisleBand, Aisle, BayHead } from "@/components/AdminChrome";
import { CatalogueTransfer } from "@/components/AdminImport";
import { VendorRail } from "@/components/AdminRails";
import { aisle, whoAmI, type AisleVendor } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Import and export" };

export default async function ImportExport() {
  const who = await whoAmI();

  let vendors: AisleVendor[] = [];
  let failed = false;
  try {
    vendors = await aisle();
  } catch {
    failed = true;
  }

  const apps = vendors.reduce((n, v) => n + v.appCount, 0);
  const logPaths = vendors.reduce((n, v) => n + v.logPathCount, 0);

  return (
    <>
      <AisleBand
        trail={[{ label: "Catalogue", href: "/admin" }, { label: "Import and export" }]}
        who={who?.userDetails ?? null}
      />

      <main id="main" tabIndex={-1} className="rack">
        <BayHead
          name="Import and export"
          back={{ label: "Catalogue", href: "/admin" }}
          facts={
            failed
              ? "The store is not answering"
              : `${vendors.length} vendors · ${apps} apps · ${logPaths} log paths stored now`
          }
        />
        <Aisle rail={<VendorRail vendors={vendors} />}>
          <CatalogueTransfer />
        </Aisle>
      </main>
    </>
  );
}
