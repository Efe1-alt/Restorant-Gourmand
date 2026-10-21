import type { ReactNode } from "react";
import { manrope, playfair } from "@/app/fonts";
import { CartButton } from "@/components/CartButton";
import { CartDrawer } from "@/components/CartDrawer";
import { ScrollToTopOnReload } from "@/components/ScrollToTopOnReload";
import { CartProvider } from "@/lib/cart";
import { LocaleProvider } from "@/lib/locale-context";
import { href, type Locale } from "@/lib/routes";
import { getFeaturedDishes, getShopConfig } from "@/lib/server/catalog";
import { ShopProvider } from "@/lib/shop-context";

// "Add to your lunch" in the basket: bread, every drink, three desserts.
const SUGGESTION_SLUGS = [
  "pitka-byal-hlyab",
  "pitka-palnozarnesta",
  "koka-kola",
  "koka-kola-bez-zahar",
  "fanta-portokal",
  "fanta-limon",
  "fanta-grozde",
  "studen-chay-fuzetea-praskova",
  "studen-chay-fuzetea-limon",
  "tiramisu",
  "chiyzkeyk",
  "domashna-biskvitena-torta",
];

// The <html> shell shared by the Bulgarian and English root layouts.
export async function SiteShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [config, suggestions] = await Promise.all([
    getShopConfig(locale),
    getFeaturedDishes(locale, SUGGESTION_SLUGS),
  ]);
  const home = href("home", locale);
  // Reloading a marketing page returns to the home page (existing behaviour),
  // but never on checkout and order-status pages.
  const keep = [href("order", locale)];
  const script = `try{if('scrollRestoration' in history){history.scrollRestoration='manual'}var n=performance.getEntriesByType('navigation')[0];var p=location.pathname;var k=${JSON.stringify(keep)}.some(function(x){return p===x||p.indexOf(x+'/')===0});if(!k&&n&&n.type==='reload'&&(p!==${JSON.stringify(home)}||location.search||location.hash)){location.replace(${JSON.stringify(home)})}}catch(e){}`;

  return (
    <html lang={locale} className={`${playfair.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {/* Synchronous so the browser's own scroll restoration never shows. */}
        <script dangerouslySetInnerHTML={{ __html: script }} />
        <ScrollToTopOnReload />
        <LocaleProvider locale={locale}>
          <ShopProvider value={{ config, suggestions }}>
            <CartProvider>
              {children}
              <CartButton />
              <CartDrawer />
            </CartProvider>
          </ShopProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
