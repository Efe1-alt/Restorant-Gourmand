import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";
import { ImageReveal } from "./ImageReveal";
import { getContent } from "@/lib/content";
import { getDictionary } from "@/lib/i18n";
import { href, type Locale } from "@/lib/routes";

// <!-- Временни снимки. Смени файловете в public/images/kuhnya/ с новите снимки на клиента. -->
// tab = key на секцията в data/menu (MenuTabs отваря таба от ?tab=).
const tiles = [
  { tab: "lunch", image: "/images/kuhnya/gotveno.webp" },
  { tab: "soups", image: "/images/kuhnya/supi.webp" },
  { tab: "salads", image: "/images/kuhnya/salati.webp" },
  { tab: "grill", image: "/images/kuhnya/skara.webp" },
  { tab: "fish", image: "/images/kuhnya/riba.webp" },
  { tab: "desserts", image: "/images/kuhnya/deserti.webp" },
];

export function Gallery({ locale }: { locale: Locale }) {
  const c = getContent(locale);
  const seeMenu = getDictionary(locale).menu.seeMenu;
  const categories = tiles.map((tile, i) => ({ ...tile, ...c.gallery[i] }));
  return (
    <section id="gallery" className="bg-cream-soft pt-12 pb-24 sm:pt-16 sm:pb-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal className="max-w-2xl">
          <h2 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">
            {c.galleryTitle}
          </h2>
          <p className="mt-5 text-ink-soft leading-relaxed">
            {c.galleryLead}
          </p>
        </ScrollReveal>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {categories.map((c, i) => (
            <ScrollReveal key={c.tab} delay={i * 0.06}>
              <a
                href={`${href("menu", locale)}?tab=${c.tab}`}
                className="group relative isolate block aspect-[4/5] overflow-hidden rounded-[12px] [transform:translateZ(0)]"
              >
                <ImageReveal delay={i * 0.04} className="absolute inset-0">
                  <Image
                    src={c.image}
                    alt={c.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="object-cover transition-transform duration-[400ms] ease-out group-hover:scale-105"
                  />
                </ImageReveal>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5">
                  <h3 className="font-serif-heading text-[18px] font-medium leading-tight text-white sm:text-[24px]">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-[13px] text-white/85">
                    {seeMenu}{" "}
                    <span className="inline-block transition-transform duration-[400ms] ease-out group-hover:translate-x-1">
                      →
                    </span>
                  </p>
                </div>
              </a>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
