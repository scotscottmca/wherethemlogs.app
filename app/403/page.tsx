import Link from "next/link";
import type { Metadata } from "next";
import { Header, Footer } from "@/components/Chrome";
import { IconArrow } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Not your bay",
  robots: { index: false, follow: false },
};

/** Signed in, but without the admin role. The Static Web App rewrites 403 here. */
export default function Forbidden() {
  return (
    <>
      <Header />
      <main className="rack">
        <div className="void" style={{ paddingInline: 0 }}>
          <p className="tag mono" style={{ margin: 0 }}>
            Bay 403
          </p>
          <h1 className="void__h">Not your bay</h1>
          <p className="void__p">
            You are signed in, but this account does not carry the admin role. Ask whoever
            runs the catalogue to grant it, then reload - the index itself needs no sign-in
            at all.
          </p>
          <Link className="btn tag mono" href="/">
            Back to the index
            <IconArrow size={15} />
          </Link>
        </div>
      </main>
      <Footer entryCount={null} />
    </>
  );
}
