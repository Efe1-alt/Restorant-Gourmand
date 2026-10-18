import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { MenuPreview } from "@/components/MenuPreview";
import { Gallery } from "@/components/Gallery";
import { SocialProof } from "@/components/SocialProof";
import { LocationHours } from "@/components/LocationHours";
import { Footer } from "@/components/Footer";
import { siteConfig } from "@/lib/site-config";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: siteConfig.name,
  servesCuisine: siteConfig.cuisine,
  telephone: siteConfig.contact.phone,
  hasMap: siteConfig.contact.mapsUrl,
  address: {
    "@type": "PostalAddress",
    streetAddress: siteConfig.contact.streetAddress,
    addressLocality: siteConfig.contact.addressLocality,
    addressCountry: siteConfig.contact.addressCountry,
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Navbar />
      <main>
        <Hero />
        <About />
        <MenuPreview />
        <Gallery />
        <SocialProof />
        <LocationHours />
      </main>
      <Footer />
    </>
  );
}
