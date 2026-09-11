import Link from "next/link";
import { Header, Footer } from "@/components/Chrome";
import { IconArrow } from "@/components/Icons";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="rack">
        <div className="void" style={{ paddingInline: 0 }}>
          <p className="tag mono" style={{ margin: 0 }}>
            Error 404
          </p>
          <h1 className="void__h">No such location</h1>
          <p className="void__p">
            There is nothing at this address. The index is the fastest way back.
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
