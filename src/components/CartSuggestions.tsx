"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, UtensilsCrossed } from "lucide-react";
import { findMenuEntry, menuSections, sectionEntryId, type MenuEntry } from "@/data/menu";
import { menuImage } from "@/data/menu/images";
import { useCart } from "@/lib/cart";

const section = (key: string) => menuSections.find((s) => s.key === key)!;

// „Добави към обяда“: питките, всички напитки и три десерта. Ключовете са
// точните имена от bread.json / drinks.json / desserts.json.
const suggestions: MenuEntry[] = [
  ...["Питка бял хляб", "Питка пълнозърнеста"].map((name) => `bread:${name}`),
  ...section("drinks").items.map((item) => sectionEntryId("drinks", item)),
  ...["Тирамису", "Чийзкейк", "Домашна бисквитена торта"].map((name) => `desserts:${name}`),
]
  .map((id) => findMenuEntry(id))
  .filter((entry) => entry !== undefined);

// Ред от мини карти, които се скролват настрани. Каквото вече е в количката,
// не се показва — след „+“ картата остава за миг с „✓“ и тогава изчезва.
export function CartSuggestions() {
  const { add, quantityOf } = useCart();
  const [justAdded, setJustAdded] = useState<string[]>([]);

  useEffect(() => {
    if (justAdded.length === 0) return;
    const id = window.setTimeout(() => setJustAdded([]), 800);
    return () => window.clearTimeout(id);
  }, [justAdded]);

  const visible = suggestions.filter((e) => quantityOf(e.id) === 0 || justAdded.includes(e.id));
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="cart-suggestions" className="pb-6 pt-5">
      <h3
        id="cart-suggestions"
        className="text-[14px] font-medium uppercase tracking-[0.12em] text-ink-soft"
      >
        Добави към обяда
      </h3>
      <ul className="-mx-5 mt-3 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        <AnimatePresence initial={false}>
          {visible.map((entry) => {
            const src = menuImage(entry);
            const added = justAdded.includes(entry.id);
            return (
              <motion.li
                key={entry.id}
                layout
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="w-[120px] shrink-0 snap-start"
              >
                <div className="relative h-[90px] w-[120px] overflow-hidden rounded-lg bg-cream-soft">
                  {src ? (
                    <Image src={src} alt="" fill sizes="120px" className="object-cover" />
                  ) : (
                    <span aria-hidden className="flex h-full w-full items-center justify-center text-ink-soft/35">
                      <UtensilsCrossed className="h-7 w-7" strokeWidth={1.25} />
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => {
                      add(entry);
                      setJustAdded((ids) => [...ids, entry.id]);
                    }}
                    aria-label={added ? `${entry.item.name} е добавено` : `Добави ${entry.item.name} в количката`}
                    className={`absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full text-cream shadow-md shadow-black/20 transition-colors duration-200 ${
                      added ? "bg-olive" : "bg-terracotta hover:bg-terracotta-dark"
                    }`}
                  >
                    {added ? (
                      <Check aria-hidden className="h-4 w-4" strokeWidth={2.5} />
                    ) : (
                      <Plus aria-hidden className="h-4 w-4" strokeWidth={2.5} />
                    )}
                  </button>
                </div>
                <p title={entry.item.name} className="mt-2 line-clamp-2 text-[13px] leading-snug text-ink">
                  {entry.item.name}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-terracotta">{entry.item.price}</p>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
