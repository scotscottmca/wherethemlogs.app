import Link from "next/link";
import { RailHead, RailRow } from "./AdminChrome";
import type { AisleVendor } from "@/lib/server/admin";
import type { App } from "@/lib/model";

/**
 * The rail names the aisle you are standing in. Above an app it lists that
 * vendor's other bays, because that is what you reach for next; everywhere else
 * it lists the vendors.
 */
export function VendorRail({
  vendors,
  currentId,
}: {
  vendors: AisleVendor[];
  currentId?: string;
}) {
  return (
    <>
      <RailHead legend="Apps · paths">Vendors · {vendors.length}</RailHead>
      {vendors.map((vendor) => (
        <RailRow
          key={vendor.id}
          href={`/admin/v/${vendor.id}`}
          name={vendor.name}
          current={vendor.id === currentId}
          meta={`${vendor.appCount} · ${vendor.logPathCount}`}
        />
      ))}
    </>
  );
}

export function AppRail({
  vendorId,
  vendorName,
  apps,
  currentId,
}: {
  vendorId: string;
  vendorName: string;
  apps: App[];
  currentId?: string;
}) {
  return (
    <>
      <RailHead legend="Log paths">
        {vendorName} · {apps.length}
      </RailHead>
      <Link href="/admin" className="admRail__row admRail__row--up">
        <span className="tag mono">All vendors</span>
      </Link>
      {apps.map((app) => (
        <RailRow
          key={app.id}
          href={`/admin/v/${vendorId}/a/${app.id}`}
          name={app.name}
          current={app.id === currentId}
          meta={`${app.logPaths.length} paths`}
        />
      ))}
    </>
  );
}
