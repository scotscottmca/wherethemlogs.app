import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getPrincipal } from "@/lib/server/auth";
import { Header, Footer } from "@/components/Chrome";
import { IconArrow } from "@/components/Icons";

// Reads searchParams to tell "no admin role" apart from "no auth configured",
// so it cannot be prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin access",
  robots: { index: false, follow: false },
};

/** Signed in, but without the admin role. The Static Web App rewrites 403 here. */
export default async function Forbidden({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const unconfigured = reason === "unconfigured";

  // Say who the platform thinks you are and what it sent. Being refused without
  // being told which account was refused is the whole of this page's failure
  // mode: the answer is usually a second account, or a role assignment that
  // landed on the wrong one.
  const principal = unconfigured ? null : getPrincipal(new Request("http://x", { headers: await headers() }));

  return (
    <>
      <Header />
      <main className="rack">
        <div className="void" style={{ paddingInline: 0 }}>
          <p className="tag mono" style={{ margin: 0 }}>
            {unconfigured ? "Bay 503" : "Bay 403"}
          </p>
          <h1 className="void__h">{unconfigured ? "No lock fitted yet" : "Not your bay"}</h1>
          <p className="void__p">
            {unconfigured
              ? "Admin sign-in has not been configured on this deployment, so there is nothing to sign in to. Set authProvider and authClientId in the infrastructure parameters and redeploy. The index itself is unaffected and needs no sign-in at all."
              : "You are signed in, but this account is not an administrator. Ask whoever runs the catalogue to grant it, then reload - the index itself needs no sign-in at all."}
          </p>
          {principal && (
            <dl className="whoami">
              <dt className="tag mono">Signed in as</dt>
              <dd className="mono">{principal.userDetails || principal.userId || "unknown"}</dd>
              <dt className="tag mono">Roles in your token</dt>
              <dd className="mono">
                {principal.roles.length ? principal.roles.join(", ") : "none"}
              </dd>
            </dl>
          )}

          {principal && !principal.roles.length && (
            <p className="void__p">
              An account assigned <span className="mono">Default Access</span> rather than a
              named role carries no roles at all, which looks identical to not being assigned.
              Check the assignment on that exact account, then sign out and back in - the role
              is written into the token when you sign in, so a reload will not pick it up.
            </p>
          )}

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
