import type { Metadata } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import { ScrollToTopOnReload } from "@/components/ScrollToTopOnReload";
import { CartButton } from "@/components/CartButton";
import { CartProvider } from "@/lib/cart";
import "./globals.css";

const fraunces = Playfair_Display({
  variable: "--font-fraunces",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gourmand – Домашна храна в Пловдив",
  description:
    "Домашни ястия от истински продукти, приготвени всеки ден в Пловдив. Поръчай за вкъщи или с доставка.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bg"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {/* Изключва браузърното scroll restoration възможно най-рано (преди React
            да хидратира), за да няма видим "скок" при reload — вижда се старата
            позиция за миг, после JS я коригира. Трябва да е синхронен inline
            script, не useEffect — тогава вече е късно, браузърът вече е скролнал. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if('scrollRestoration' in history){history.scrollRestoration='manual'}}catch(e){}`,
          }}
        />
        <ScrollToTopOnReload />
        <CartProvider>
          {children}
          <CartButton />
        </CartProvider>
      </body>
    </html>
  );
}
