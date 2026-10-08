"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { siteConfig } from "@/lib/site-config";
import { AddToCartButton } from "./AddToCartButton";
import { formatMenuPrice, menuByCategory } from "@/data/menu";

export function MenuTabs() {
  const categories = menuByCategory();
  const [active, setActive] = useState<string>(categories[0].name);
  const activeCategory = categories.find((c) => c.name === active) ?? categories[0];

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.name}
            type="button"
            onClick={() => setActive(cat.name)}
            aria-pressed={active === cat.name}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-200 ${
              active === cat.name
                ? "bg-terracotta text-cream"
                : "border border-line text-ink-soft hover:border-terracotta hover:text-terracotta"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="mt-14 min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl divide-y divide-line"
          >
            {activeCategory.items.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                </div>
                <div className="flex items-center gap-4">
                  <span className="whitespace-nowrap text-sm font-semibold text-terracotta">
                    {formatMenuPrice(item.price)}
                  </span>
                  <AddToCartButton name={item.name} price={formatMenuPrice(item.price)} />
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-16 text-center">
        <a
          href={siteConfig.menuPdfUrl}
          className="inline-block rounded-full border border-line px-7 py-3.5 text-sm font-semibold text-ink transition-colors duration-200 hover:border-terracotta hover:text-terracotta"
        >
          Пълно меню (PDF)
        </a>
      </div>
    </div>
  );
}
