import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { AddToCartButton } from "./AddToCartButton";
import { lunchDays, menuItemDetails, menuSections, type MenuItem } from "@/data/menu";

// Извадка от пълното меню — по едно-две ястия от всяка категория. Данните
// идват от JSON файловете в data/menu; тук са само имената.
const featured = [
  "Пържени кюфтета с картофена салата",
  "Свинска вратна пържола с моцарела и домати",
  "Пилешка пържола от филе на скара със задушени зеленчуци",
  "Боб чорба",
  "Шопска салата",
  "Млечен крем",
];

// Първото срещане по име — секциите, после обедното меню по дни.
const allItems: MenuItem[] = [
  ...menuSections.flatMap((s) => s.items),
  ...lunchDays.flatMap((d) => d.items),
];

export function MenuPreview() {
  const dishes = featured
    .map((name) => allItems.find((item) => item.name === name))
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
        {dishes.map((dish, i) => {
          const details = menuItemDetails(dish);
          return (
            <ScrollReveal
              key={dish.name}
              delay={i * 0.06}
              className="flex items-center justify-between gap-4 border-b border-line py-4"
            >
              <div>
                <h3 className="font-medium">{dish.name}</h3>
                {details && <p className="mt-1 font-sans text-sm text-ink/65">{details}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="whitespace-nowrap text-sm font-semibold text-terracotta">
                  {dish.price}
                </span>
                <AddToCartButton name={dish.name} price={dish.price} />
              </div>
            </ScrollReveal>
          );
        })}
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
