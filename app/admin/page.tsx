import type { Metadata } from "next";
import Link from "next/link";
import { AisleBand, Aisle, BayHead } from "@/components/AdminChrome";
import { VendorRail } from "@/components/AdminRails";
import { StockList } from "@/components/AdminStock";
import { IconArrow } from "@/components/Icons";
import { aisle, stock, whoAmI, type AisleVendor, type StockRow } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Stock control" };

export default async function StockControl() {
  const who = await whoAmI();

  let vendors: AisleVendor[] = [];
  let rows: StockRow[] = [];
  let failed = false;
  try {
    [vendors, rows] = await Promise.all([aisle(), stock()]);
  } catch {
    // The store is unreachable. Say so rather than 500ing the whole bench.
    failed = true;
  }

  const logPaths = rows.reduce((n, r) => n + r.logPathCount, 0);
  const empty = rows.reduce((n, r) => n + (r.logPathCount ? 0 : 1), 0);

  return (
    <>
      <AisleBand trail={[{ label: "Stock control" }]} who={who?.userDetails ?? null} />

      <main className="rack">
        <BayHead
          name="Stock control"
          facts={
            failed
              ? "The store is not answering"
              : `${String(vendors.length).padStart(2, "0")} vendors · ${String(rows.length).padStart(2, "0")} apps · ${String(logPaths).padStart(3, "0")} log paths${empty ? ` · ${empty} app${empty === 1 ? "" : "s"} with no path` : ""}`
          }
          actions={
            <Link href="/admin/v/new" className="btn tag mono">
              Rack a vendor
              <IconArrow size={15} />
            </Link>
          }
        />

        {failed ? (
          <div className="void">
            <h2 className="void__h">The catalogue is not answering</h2>
            <p className="void__p">
              Nothing is wrong with what you were about to do - this is the store. Reload in
              a moment. No write has been attempted.
            </p>
          </div>
        ) : rows.length || vendors.length ? (
          <Aisle rail={<VendorRail vendors={vendors} />}>
            <StockList rows={rows} />
          </Aisle>
        ) : (
          <div className="void">
            <h2 className="void__h">Nothing racked yet</h2>
            <p className="void__p">
              The catalogue is empty. A path belongs to an app and an app belongs to a
              vendor, so the first thing to rack is the vendor - then its apps, then the
              paths on each one.
            </p>
            <Link className="btn tag mono" href="/admin/v/new">
              Rack the first vendor
              <IconArrow size={15} />
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
