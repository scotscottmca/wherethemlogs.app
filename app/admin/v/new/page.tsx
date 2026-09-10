import type { Metadata } from "next";
import { AisleBand, Aisle, BayHead } from "@/components/AdminChrome";
import { VendorRail } from "@/components/AdminRails";
import { VendorEditor } from "@/components/AdminVendor";
import { aisle, whoAmI, type AisleVendor } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New vendor" };

export default async function NewVendor() {
  const who = await whoAmI();

  let vendors: AisleVendor[] = [];
  try {
    vendors = await aisle();
  } catch {
    // The rail is context, not the task. A cold store does not stop the form.
  }

  return (
    <>
      <AisleBand
        trail={[{ label: "Stock control", href: "/admin" }, { label: "New vendor" }]}
        who={who?.userDetails ?? null}
      />

      <main className="rack">
        <BayHead
          name="New vendor"
          facts="A vendor is an aisle - its apps and their icons hang off it"
          back={{ label: "Stock control", href: "/admin" }}
        />
        <Aisle rail={<VendorRail vendors={vendors} />}>
          <VendorEditor vendor={null} />
        </Aisle>
      </main>
    </>
  );
}
