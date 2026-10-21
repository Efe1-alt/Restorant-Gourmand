"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ShoppingBasket, Trash2, UtensilsCrossed, X } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart";
import { useLocale, useT } from "@/lib/locale-context";
import { formatCents } from "@/lib/pricing";
import { href } from "@/lib/routes";
import { localizeWeight } from "@/lib/i18n";
import { useModal } from "@/lib/use-modal";
import { CartSuggestions } from "./CartSuggestions";
import { QuantityStepper } from "./QuantityStepper";

// sm и нагоре: панел отдясно; на мобилни: лист, изплъзващ се отдолу.
function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const isDesktop = () => window.matchMedia("(min-width: 640px)").matches;

const slide = { duration: 0.3, ease: "easeInOut" } as const;

export function CartDrawer() {
  const { items, count, isOpen, closeCart, subtotalCents, staleRemoved, dismissStale } = useCart();
  const locale = useLocale();
  const t = useT().cart;
  const menuHref = href("menu", locale);
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => true);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [scrolledUnder, setScrolledUnder] = useState(false);

  useModal(isOpen, closeCart, panelRef, closeRef);

  // Сянка над обобщението, докато под него има още съдържание.
  const measure = useCallback(() => {
    const el = scrollRef.current;
    setScrolledUnder(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!isOpen || !el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [isOpen, items.length, measure]);

  // На страницата „Меню“ само затваря и скролва нагоре до табовете; иначе води там.
  const toMenu = (e: MouseEvent) => {
    closeCart();
    if (pathname === menuHref) {
      e.preventDefault();
      // След като useModal отключи скрола на страницата.
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
    }
  };

  const offscreen = desktop ? { x: "100%" } : { y: "100%" };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            aria-hidden
            onClick={closeCart}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={slide}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            initial={offscreen}
            animate={{ x: 0, y: 0 }}
            exit={offscreen}
            transition={slide}
            // На мобилни листът се дърпа надолу за затваряне — само от дръжката.
            drag={desktop ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) closeCart();
            }}
            className="absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col rounded-t-2xl bg-cream shadow-2xl sm:inset-y-0 sm:left-auto sm:h-auto sm:w-[440px] sm:rounded-none"
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex shrink-0 touch-none justify-center pb-1 pt-2.5 sm:hidden"
            >
              <span aria-hidden className="h-1.5 w-10 rounded-full bg-line" />
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-line px-5 pb-4 pt-2 sm:px-6 sm:pt-4">
              <h2 id="cart-title" className="text-2xl font-medium">
                {t.title}
                {count > 0 && <span className="ml-1.5 font-normal text-ink-soft/70">({count})</span>}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={closeCart}
                aria-label={t.close}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-terracotta hover:text-terracotta"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12 text-center">
                <ShoppingBasket aria-hidden className="h-16 w-16 text-ink-soft/30" strokeWidth={1.25} />
                <p className="mt-5 text-lg font-medium">{t.empty}</p>
                <p className="mt-1.5 text-sm text-ink-soft">{t.emptyLead}</p>
                {staleRemoved && <p className="mt-4 text-sm text-terracotta-dark">{t.staleRemoved}</p>}
                <Link
                  href={menuHref}
                  onClick={toMenu}
                  className="mt-7 inline-flex min-h-11 items-center rounded-full bg-terracotta px-7 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
                >
                  {t.toMenu}
                </Link>
              </div>
            ) : (
              <>
                <div ref={scrollRef} onScroll={measure} className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6">
                  <div>
                    {staleRemoved && (
                      <p role="status" className="mt-4 rounded-lg bg-cream-soft px-4 py-3 text-sm text-terracotta-dark">
                        {t.staleRemoved}{" "}
                        <button type="button" onClick={dismissStale} className="font-semibold underline">
                          OK
                        </button>
                      </p>
                    )}
                    <ul className="border-b border-line">
                      <AnimatePresence initial={false}>
                        {items.map((item) => (
                          <CartRow key={item.dishId} item={item} />
                        ))}
                      </AnimatePresence>
                    </ul>
                    <CartSuggestions />
                  </div>
                </div>

                <div
                  className={`shrink-0 border-t border-line bg-cream-soft px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 transition-shadow duration-200 sm:px-6 ${
                    scrolledUnder ? "shadow-[0_-6px_16px_rgba(0,0,0,0.07)]" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-base font-semibold">{t.subtotal}</span>
                    <span className="text-xl font-semibold">{formatCents(subtotalCents, locale)}</span>
                  </div>
                  <Link
                    href={href("order", locale)}
                    onClick={closeCart}
                    className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-terracotta text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
                  >
                    {t.checkout(formatCents(subtotalCents, locale))}
                  </Link>
                  <p className="mt-2.5 text-center text-xs text-ink-soft/80">{t.deliveryNote}</p>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const { remove } = useCart();
  const locale = useLocale();
  const t = useT().cart;

  return (
    <motion.li
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden border-line [&:not(:first-child)]:border-t"
    >
      <div className="flex items-center gap-[14px] py-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[10px] bg-cream-soft">
          {item.image ? (
            <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <span aria-hidden className="flex h-full w-full items-center justify-center text-ink-soft/35">
              <UtensilsCrossed className="h-6 w-6" strokeWidth={1.25} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p title={item.name} className="line-clamp-2 text-base font-medium leading-snug">
            {item.name}
          </p>
          {item.weight && <p className="mt-0.5 text-[13px] text-ink-soft">{localizeWeight(item.weight, locale)}</p>}
          <div className="mt-2 flex">
            <QuantityStepper dishId={item.dishId} name={item.name} quantity={item.quantity} max={item.max} size="sm" />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end self-start">
          <span className="text-base font-semibold text-terracotta">{formatCents(item.priceCents * item.quantity, locale)}</span>
          {item.quantity > 1 && (
            <span className="mt-0.5 text-xs text-ink-soft/80">
              {item.quantity} × {formatCents(item.priceCents, locale)}
            </span>
          )}
          <button
            type="button"
            onClick={() => remove(item.dishId)}
            aria-label={t.remove(item.name)}
            className="relative -mr-1.5 mt-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/50 transition-colors duration-200 after:absolute after:-inset-1.5 after:content-[''] hover:text-red-700"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.li>
  );
}
