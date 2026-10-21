import type { Metadata } from "next";
import { alternates, siteUrl, type Locale, type RouteKey } from "./routes";

// Indexing stays off until launch (NEXT_PUBLIC_SITE_INDEXABLE=true).
export const indexable = process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true";

export function pageMetadata(key: RouteKey, locale: Locale, title: string, description: string): Metadata {
  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    alternates: alternates(key, locale),
    openGraph: {
      title,
      description,
      locale: locale === "bg" ? "bg_BG" : "en_GB",
      alternateLocale: locale === "bg" ? "en_GB" : "bg_BG",
      type: "website",
      siteName: "Gourmand",
      images: [{ url: "/hero-storefront.jpg" }],
    },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export const privateMetadata: Metadata = { robots: { index: false, follow: false } };
