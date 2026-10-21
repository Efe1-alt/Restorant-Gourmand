import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import type { Locale } from "@/lib/routes";
import { getShopConfig } from "@/lib/server/catalog";

export async function PageFrame({ locale, children }: { locale: Locale; children: ReactNode }) {
  const config = await getShopConfig(locale);
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer locale={locale} openingHours={config.ordering.openingHours} />
    </>
  );
}
