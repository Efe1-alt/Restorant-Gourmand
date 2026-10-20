// Public URLs per language. Bulgarian keeps the current paths; English lives
// under /en with English slugs. Every page has an hreflang pair.

export type Locale = "bg" | "en";
export const LOCALES: Locale[] = ["bg", "en"];

export const routes = {
  home: { bg: "/", en: "/en" },
  menu: { bg: "/menu", en: "/en/menu" },
  order: { bg: "/porachka", en: "/en/order" },
  privacy: { bg: "/poveritelnost", en: "/en/privacy" },
  terms: { bg: "/obshti-usloviya", en: "/en/terms" },
} as const;

export type RouteKey = keyof typeof routes;

export function href(key: RouteKey, locale: Locale) {
  return routes[key][locale];
}

export function statusHref(token: string, locale: Locale) {
  return locale === "bg" ? `/porachka/status/${token}` : `/en/order/status/${token}`;
}

export function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "bg";
}

// The same page in the other language (falls back to the home page).
export function switchLocalePath(pathname: string, to: Locale) {
  const from = localeFromPath(pathname);
  for (const key of Object.keys(routes) as RouteKey[]) {
    if (routes[key][from] === pathname) return routes[key][to];
  }
  return routes.home[to];
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Metadata `alternates` for a page: canonical + hreflang pair + x-default (BG).
export function alternates(key: RouteKey, locale: Locale) {
  return {
    canonical: routes[key][locale],
    languages: {
      bg: routes[key].bg,
      en: routes[key].en,
      "x-default": routes[key].bg,
    },
  };
}
