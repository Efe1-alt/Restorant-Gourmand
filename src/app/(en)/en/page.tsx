import type { Metadata } from "next";
import { HomePage } from "@/components/site/HomePage";
import { getContent } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

const meta = getContent("en").meta;
export const metadata: Metadata = pageMetadata("home", "en", meta.homeTitle, meta.homeDescription);

export default function Page() {
  return <HomePage locale="en" />;
}
