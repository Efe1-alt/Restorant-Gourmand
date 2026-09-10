import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { siteConfig } from "@/lib/site-config";

// Извадка от пълното меню — по едно-две ястия от всяка категория. Пълният
// списък е на /menu (виж MenuTabs.tsx) — не се дублира тук.
const featured = [
  { category: "Салати", name: "Шопска салата" },
  { category: "Основни ястия", name: "Свинско бавно печено в пюре" },
  { category: "Скара", name: "Кебапчета с гарнитура" },
  { category: "Скара", name: "Пилешка пържола" },
  { category: "Супи", name: "Шкембе чорба" },
  { category: "Десерти", name: "Грис халва" },
];

function findDish(category: string, name: string) {
  const cat = siteConfig.menuCategories.find((c) => c.name === category);
  return cat?.items.find((i) => i.name === name) ?? null;
}

export function MenuPreview() {
  const dishes = featured
    .map((f) => ({ ...f, dish: findDish(f.category, f.name) }))
    .filter((f) => f.dish !== null);

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
        {dishes.map(({ category, dish }, i) => (
          <ScrollReveal
            key={dish!.name}
            delay={i * 0.06}
            className="flex items-baseline justify-between gap-4 border-b border-line py-4"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-terracotta">
                {category}
              </p>
              <h3 className="mt-1 font-medium">{dish!.name}</h3>
              <p className="mt-1 text-sm text-ink-soft">{dish!.description}</p>
            </div>
            <span className="whitespace-nowrap text-sm font-semibold text-terracotta">
              {dish!.price}
            </span>
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
