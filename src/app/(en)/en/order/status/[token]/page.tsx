import type { Metadata } from "next";
import { StatusPage } from "@/components/site/StatusPage";
import { getDictionary } from "@/lib/i18n";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = { ...privateMetadata, title: `${getDictionary("en").status.title} — Gourmand` };

export default async function Page({ params }: PageProps<"/en/order/status/[token]">) {
  const { token } = await params;
  return <StatusPage locale="en" token={decodeURIComponent(token)} />;
}
