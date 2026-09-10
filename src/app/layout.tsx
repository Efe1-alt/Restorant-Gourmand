import type { Metadata } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import { siteConfig } from "@/lib/site-config";
import { ScrollToTopOnReload } from "@/components/ScrollToTopOnReload";
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
  title: `[DEMO] ${siteConfig.name} — ${siteConfig.tagline}`,
  description: `${siteConfig.cuisine} в ${siteConfig.city}. Private concept demo — не е официалният сайт на ресторанта.`,
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
        {children}
      </body>
    </html>
  );
}
