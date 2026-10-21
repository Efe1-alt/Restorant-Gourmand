import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/routes";
import { indexable } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/porachka/status", "/en/order/status"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
