import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { DishCard } from "./DishCard";
import { menuEntries } from "@/data/menu";

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

export function MenuPreview() {
  // Първото срещане по име — секциите, после обедното меню по дни.
  const entries = featured
    .map((name) => menuEntries.find((e) => e.item.name === name))
    .filter((entry) => entry !== undefined);

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

      {/* Същите карти като в страницата „Меню“. */}
      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {entries.map((entry, i) => (
          <ScrollReveal key={entry.item.name} delay={i * 0.06} className="flex">
            <DishCard item={entry.item} entry={entry} className="flex-1" />
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
