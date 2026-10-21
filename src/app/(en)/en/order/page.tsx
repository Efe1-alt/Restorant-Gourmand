import type { Metadata } from "next";
import { CheckoutPage } from "@/components/site/CheckoutPage";
import { getContent } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

const meta = getContent("en").meta;
export const metadata: Metadata = pageMetadata("order", "en", meta.orderTitle, meta.orderDescription);

export default function Page() {
  return <CheckoutPage locale="en" />;
}
