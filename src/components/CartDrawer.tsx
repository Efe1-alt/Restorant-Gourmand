"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ShoppingBasket, Trash2, UtensilsCrossed, X } from "lucide-react";
import { findMenuEntry } from "@/data/menu";
import { menuImage } from "@/data/menu/images";
import { useCart, type CartItem } from "@/lib/cart";
import { formatCents, orderTotals } from "@/lib/ordering";
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
  const { items, count, isOpen, closeCart, subtotalCents } = useCart();
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => true);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [scrolledUnder, setScrolledUnder] = useState(false);
  const totals = orderTotals(subtotalCents, null);
  const blocked = totals.missingCents > 0;

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
    if (pathname === "/menu") {
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
                Количка
                {count > 0 && <span className="ml-1.5 font-normal text-ink-soft/70">({count})</span>}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={closeCart}
                aria-label="Затвори количката"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-terracotta hover:text-terracotta"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12 text-center">
                <ShoppingBasket aria-hidden className="h-16 w-16 text-ink-soft/30" strokeWidth={1.25} />
                <p className="mt-5 text-lg font-medium">Количката е празна</p>
                <p className="mt-1.5 text-sm text-ink-soft">Разгледайте днешното обедно меню</p>
                <Link
                  href="/menu"
                  onClick={toMenu}
                  className="mt-7 inline-flex min-h-11 items-center rounded-full bg-terracotta px-7 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
                >
                  Към менюто
                </Link>
              </div>
            ) : (
              <>
                <div ref={scrollRef} onScroll={measure} className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6">
                  <div>
                    <ul className="border-b border-line">
                      <AnimatePresence initial={false}>
                        {items.map((item) => (
                          <CartRow key={item.id} item={item} />
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
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-soft">Междинна сума</dt>
                      <dd>{formatCents(totals.subtotalCents)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-soft">Доставка</dt>
                      {/* ПОТВЪРДИ С КЛИЕНТА: цена за доставка (siteConfig.ordering.deliveryFeeCents) */}
                      <dd className="text-right">
                        {totals.deliveryCents === null ? "По телефона" : formatCents(totals.deliveryCents)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-line pt-2.5">
                      <dt className="text-base font-semibold">Общо</dt>
                      <dd className="text-xl font-semibold">{formatCents(totals.totalCents)}</dd>
                    </div>
                  </dl>

                  {/* ПОТВЪРДИ С КЛИЕНТА: минимумът идва от siteConfig.ordering.minOrderCents */}
                  {blocked && (
                    <p className="mt-3 text-sm font-medium text-terracotta-dark">
                      Остават {formatCents(totals.missingCents)} до минималната поръчка
                    </p>
                  )}

                  {blocked ? (
                    <button
                      type="button"
                      disabled
                      className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-terracotta text-sm font-semibold text-cream opacity-50"
                    >
                      Поръчай · {formatCents(totals.totalCents)}
                    </button>
                  ) : (
                    <Link
                      href="/porachka"
                      onClick={closeCart}
                      className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-terracotta text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
                    >
                      Поръчай · {formatCents(totals.totalCents)}
                    </Link>
                  )}
                  <p className="mt-2.5 text-center text-xs text-ink-soft/80">Ще ви се обадим за потвърждение</p>
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
  const entry = findMenuEntry(item.id);
  const src = entry ? menuImage(entry) : null;

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
          {src ? (
            <Image src={src} alt="" fill sizes="64px" className="object-cover" />
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
          {item.weight && <p className="mt-0.5 text-[13px] text-ink-soft">{item.weight}</p>}
          <div className="mt-2 flex">
            <QuantityStepper id={item.id} name={item.name} quantity={item.quantity} size="sm" />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end self-start">
          <span className="text-base font-semibold text-terracotta">{formatCents(item.price * item.quantity)}</span>
          {item.quantity > 1 && (
            <span className="mt-0.5 text-xs text-ink-soft/80">
              {item.quantity} × {formatCents(item.price)}
            </span>
          )}
          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label={`Премахни ${item.name} от количката`}
            className="relative -mr-1.5 mt-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/50 transition-colors duration-200 after:absolute after:-inset-1.5 after:content-[''] hover:text-red-700"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.li>
  );
}
