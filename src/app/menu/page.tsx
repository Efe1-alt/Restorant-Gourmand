import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MenuTabs } from "@/components/MenuTabs";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `[DEMO] Меню — ${siteConfig.name}`,
  description: `Меню на ${siteConfig.name} — ${siteConfig.cuisine} в ${siteConfig.city}.`,
  robots: { index: false, follow: false },
};

export default function MenuPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8 sm:pt-40">
          <div className="text-center">
            <h1 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">
              Меню
            </h1>
          </div>

          <div className="mt-14">
            <MenuTabs />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
