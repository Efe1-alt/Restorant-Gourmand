import type { Metadata } from "next";
import { MenuPage } from "@/components/site/MenuPage";
import { getContent } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

const meta = getContent("en").meta;
export const metadata: Metadata = pageMetadata("menu", "en", meta.menuTitle, meta.menuDescription);

export default function Page() {
  return <MenuPage locale="en" />;
}
