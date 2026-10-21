import Link from "next/link";
import type { PublicDish } from "@/lib/catalog-types";
import { getDictionary } from "@/lib/i18n";
import { href, type Locale } from "@/lib/routes";
import { DishCard } from "./DishCard";
import { ScrollReveal } from "./ScrollReveal";

// Извадка от пълното меню — по едно-две ястия от всяка категория.
export const FEATURED_SLUGS = [
  "parzheni-kyufteta-s-kartofena-salata",
  "svinska-vratna-parzhola-na-skara",
  "pileshka-parzhola-ot-but-na-skara",
  "bob-chorba",
  "shopska-salata",
  "mlechen-krem",
];

export function MenuPreview({ locale, dishes }: { locale: Locale; dishes: PublicDish[] }) {
  const t = getDictionary(locale).menu;
  return (
    <section className="mx-auto max-w-7xl px-5 pt-24 pb-12 sm:px-8 sm:pt-32 sm:pb-16">
      <ScrollReveal className="max-w-2xl">
        <h2 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">{t.fromMenu}</h2>
        <p className="mt-4 text-ink-soft leading-relaxed">{t.fromMenuLead}</p>
      </ScrollReveal>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {dishes.map((dish, i) => (
          <ScrollReveal key={dish.id} delay={i * 0.06} className="flex">
            <DishCard dish={dish} className="flex-1" />
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.2} className="mt-12 text-center">
        <Link
          href={href("menu", locale)}
          className="inline-block rounded-full bg-terracotta px-8 py-3.5 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
        >
          {t.seeFullMenu}
        </Link>
      </ScrollReveal>
    </section>
  );
}
