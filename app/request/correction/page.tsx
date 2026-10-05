import type { Metadata } from "next";
import { RequestPage } from "@/components/RequestPage";
import { githubCorrectionUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Correct a path",
  description: "Report a log path in the index that is wrong, out of date or missing a variant. No account needed.",
  alternates: { canonical: "/request/correction" },
  robots: { index: false, follow: true },
};

export default async function RequestCorrection({
  searchParams,
}: {
  searchParams: Promise<{ app?: string; platform?: string }>;
}) {
  const { app, platform } = await searchParams;
  const name = app?.slice(0, 160);
  return (
    <RequestPage
      kind="correction"
      title="Correct a path"
      lede="Tell us which path is wrong and what it should be. Say how you know, so the fix can be checked."
      initial={{ app: name, platform }}
      fallbackUrl={githubCorrectionUrl(name, platform)}
    />
  );
}
