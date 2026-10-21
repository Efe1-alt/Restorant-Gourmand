"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/lib/cart";
import { useLocale, useT } from "@/lib/locale-context";
import { formatCents } from "@/lib/pricing";
import { href } from "@/lib/routes";

// Плаващ бутон долу вдясно — само на мобилни и само когато количката не е
// празна. Скрит е на страниците за поръчка, за да не закрива формата.
export function CartButton() {
  const { count, subtotalCents, isOpen, openCart } = useCart();
  const locale = useLocale();
  const t = useT().cart;
  const pathname = usePathname();
  const visible = count > 0 && !isOpen && !pathname.startsWith(href("order", locale));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 sm:hidden"
        >
          <button
            type="button"
            onClick={openCart}
            className="flex min-h-12 items-center gap-2 rounded-full bg-terracotta px-5 text-sm font-semibold text-cream shadow-xl shadow-black/20 transition-colors duration-200 hover:bg-terracotta-dark"
          >
            {t.floating(count, formatCents(subtotalCents, locale))}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
