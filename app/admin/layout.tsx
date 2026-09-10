import type { Metadata } from "next";
import { Header, Footer } from "@/components/Chrome";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The curator's surface shares the site's chrome exactly — same header, same
 * hazard banding, same footer. It is the same warehouse; this is the bench at
 * the end of the aisle, not a different building.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer entryCount={null} />
    </>
  );
}
