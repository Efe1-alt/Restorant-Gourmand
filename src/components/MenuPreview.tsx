import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { AddToCartButton } from "./AddToCartButton";
import { formatMenuPrice, menu } from "@/data/menu";

// Извадка от пълното меню — по едно-две ястия от всяка категория. Пълният
// списък е на /menu (виж MenuTabs.tsx) — не се дублира тук.
const featured = [
  "Пържени кюфтета с картофена салата",
  "Свинска вратна пържола с моцарела и домати",
  "Пилешка пържола със задушени зеленчуци",
  "Боб чорба",
  "Шопска салата",
  "Млечен крем",
];

export function MenuPreview() {
  const dishes = featured
    .map((name) => menu.find((item) => item.name === name))
    .filter((dish) => dish !== undefined);

  return (
    <section className="mx-auto max-w-7xl px-5 pt-24 pb-12 sm:px-8 sm:pt-32 sm:pb-16">
      <ScrollReveal className="max-w-2xl">
        <h2 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">
          От менюто
        </h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          Малка извадка от кухнята ни — пълното меню е една стъпка по-нататък.
        </p>
      </ScrollReveal>

      <div className="mt-14 grid grid-cols-1 gap-x-12 gap-y-2 sm:grid-cols-2">
        {dishes.map((dish, i) => (
          <ScrollReveal
            key={dish.name}
            delay={i * 0.06}
            className="flex items-center justify-between gap-4 border-b border-line py-4"
          >
            {/* Подравнено на нивото на бутона „+ Добави“ (долния ред вдясно). */}
            <div className="self-end py-0.5">
              <h3 className="font-medium">{dish.name}</h3>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="whitespace-nowrap text-sm font-semibold text-terracotta">
                {formatMenuPrice(dish.price)}
              </span>
              <AddToCartButton name={dish.name} price={formatMenuPrice(dish.price)} />
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.2} className="mt-12 text-center">
        <Link
          href="/menu"
          className="inline-block rounded-full bg-terracotta px-8 py-3.5 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
        >
          Виж пълното меню
        </Link>
      </ScrollReveal>
    </section>
  );
}
