import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { OrderThankYou } from "@/components/OrderThankYou";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `[DEMO] Благодарим! — ${siteConfig.name}`,
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="mx-auto max-w-2xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
          <OrderThankYou />
        </section>
      </main>
      <Footer />
    </>
  );
}
