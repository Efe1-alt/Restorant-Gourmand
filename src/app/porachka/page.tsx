import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CheckoutForm } from "@/components/CheckoutForm";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `[DEMO] Поръчка — ${siteConfig.name}`,
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
          <h1 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">Поръчка</h1>
          <div className="mt-8 sm:mt-10">
            <CheckoutForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
