import type { Metadata } from "next";
import { MenuPage } from "@/components/site/MenuPage";
import { getContent } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

const meta = getContent("bg").meta;
export const metadata: Metadata = pageMetadata("menu", "bg", meta.menuTitle, meta.menuDescription);

export default function Page() {
  return <MenuPage locale="bg" />;
}
