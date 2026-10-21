import { About } from "@/components/About";
import { Footer } from "@/components/Footer";
import { Gallery } from "@/components/Gallery";
import { Hero } from "@/components/Hero";
import { LocationHours } from "@/components/LocationHours";
import { FEATURED_SLUGS, MenuPreview } from "@/components/MenuPreview";
import { Navbar } from "@/components/Navbar";
import { SocialProof } from "@/components/SocialProof";
import { getContent } from "@/lib/content";
import { href, siteUrl, type Locale } from "@/lib/routes";
import { getFeaturedDishes, getShopConfig } from "@/lib/server/catalog";
import { siteConfig } from "@/lib/site-config";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function HomePage({ locale }: { locale: Locale }) {
  const [config, featured] = await Promise.all([getShopConfig(locale), getFeaturedDishes(locale, FEATURED_SLUGS)]);
  const c = getContent(locale);
  const hours = config.ordering.openingHours;

  // Built only from the business details in site-config (address and phone
  // still to be confirmed by the owner). Opening hours are included only once
  // the owner has confirmed them in the admin.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: siteConfig.name,
    url: `${siteUrl()}${href("home", locale)}`,
    servesCuisine: locale === "bg" ? siteConfig.cuisine : "Home cooking",
    telephone: siteConfig.contact.phoneE164,
    hasMenu: `${siteUrl()}${href("menu", locale)}`,
    priceRange: "€",
    image: `${siteUrl()}/hero-storefront.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.contact.streetAddress,
      addressLocality: siteConfig.contact.addressLocality,
      addressCountry: siteConfig.contact.addressCountry,
    },
    ...(config.ordering.hoursConfirmed
      ? {
          openingHoursSpecification: hours.flatMap((h, weekday) =>
            h ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[weekday], opens: h.opens, closes: h.closes }] : []
          ),
        }
      : {}),
    sameAs: [siteConfig.contact.facebookUrl, siteConfig.contact.instagramUrl],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Navbar />
      <main>
        <Hero locale={locale} />
        <About locale={locale} openingHours={hours} />
        <MenuPreview locale={locale} dishes={featured} />
        <Gallery locale={locale} />
        <SocialProof title={c.reviewsTitle} />
        <LocationHours locale={locale} openingHours={hours} />
      </main>
      <Footer locale={locale} openingHours={hours} />
    </>
  );
}
