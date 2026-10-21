import type { MetadataRoute } from "next";
import { routes, siteUrl, type RouteKey } from "@/lib/routes";

// Public pages in both languages, each with its hreflang pair.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const keys: RouteKey[] = ["home", "menu", "order", "privacy", "terms"];
  return keys.flatMap((key) =>
    (["bg", "en"] as const).map((locale) => ({
      url: `${base}${routes[key][locale]}`,
      changeFrequency: key === "menu" ? ("daily" as const) : ("monthly" as const),
      priority: key === "home" ? 1 : key === "menu" ? 0.9 : 0.4,
      alternates: { languages: { bg: `${base}${routes[key].bg}`, en: `${base}${routes[key].en}` } },
    }))
  );
}
