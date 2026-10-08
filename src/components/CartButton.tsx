"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { formatPrice, useCart } from "@/lib/cart";

// Плаващ бутон към секцията за поръчка — видим на всеки route, докато в
// количката има нещо. Скрива се, когато самата секция е на екрана, за да не
// закрива бутона за изпращане на телефон.
export function CartButton() {
  const { count, totalCents } = useCart();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [orderInView, setOrderInView] = useState(false);

  useEffect(() => {
    const section = isHome ? document.getElementById("order") : null;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setOrderInView(entry.isIntersecting), {
      threshold: 0.1,
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, [isHome]);

  const visible = count > 0 && !(isHome && orderInView);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-4 bottom-4 z-40 sm:inset-x-auto sm:right-6 sm:bottom-6"
        >
          <Link
            href={isHome ? "#order" : "/#order"}
            className="flex items-center justify-between gap-6 rounded-full bg-terracotta px-6 py-4 text-sm font-semibold text-cream shadow-xl shadow-black/20 transition-colors duration-200 hover:bg-terracotta-dark"
          >
            <span>
              Количка · {count} {count === 1 ? "ястие" : "ястия"}
            </span>
            <span className="flex items-center gap-2">
              {formatPrice(totalCents)}
              <span aria-hidden>→</span>
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
