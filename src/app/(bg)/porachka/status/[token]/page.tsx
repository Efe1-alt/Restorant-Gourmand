import type { Metadata } from "next";
import { StatusPage } from "@/components/site/StatusPage";
import { getDictionary } from "@/lib/i18n";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = { ...privateMetadata, title: `${getDictionary("bg").status.title} — Gourmand` };

export default async function Page({ params }: PageProps<"/porachka/status/[token]">) {
  const { token } = await params;
  return <StatusPage locale="bg" token={decodeURIComponent(token)} />;
}
