import type { Metadata } from "next";
import { RequestPage } from "@/components/RequestPage";
import { githubRequestUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request an application",
  description: "Ask for an application to be added to the index of log file locations. No account needed.",
  alternates: { canonical: "/request" },
};

export default async function RequestApp({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const { app } = await searchParams;
  const name = app?.slice(0, 160);
  return (
    <RequestPage
      kind="add"
      title="Request an app"
      lede="Tell us an application that is missing and where it writes its logs. A partial entry with an honest gap is more use than a confident wrong one."
      initial={{ app: name }}
      fallbackUrl={githubRequestUrl(name)}
    />
  );
}
