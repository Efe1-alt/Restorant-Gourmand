"use client";

import { useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCents, orderTotals } from "@/lib/ordering";
import { useModal } from "@/lib/use-modal";
import { QuantityStepper } from "./QuantityStepper";

// sm и нагоре: панел отдясно; на мобилни: цял екран, изплъзващ се отдолу.
function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 640px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const isDesktop = () => window.matchMedia("(min-width: 640px)").matches;

export function CartDrawer() {
  const { items, isOpen, closeCart, remove, subtotalCents } = useCart();
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => true);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const totals = orderTotals(subtotalCents, null);
  const blocked = totals.missingCents > 0;

  useModal(isOpen, closeCart, panelRef, closeRef);

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
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-ink/40"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            initial={offscreen}
            animate={{ x: 0, y: 0 }}
            exit={offscreen}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col bg-cream shadow-2xl sm:left-auto sm:w-[420px]"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
              <h2 id="cart-title" className="text-2xl font-medium">
                Количка
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
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
                <p className="text-ink-soft">Количката е празна</p>
                <Link
                  href="/menu"
                  onClick={closeCart}
                  className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-7 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
                >
                  Разгледай менюто
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5 sm:px-6">
                  {items.map((item) => (
                    <li key={item.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{item.name}</p>
                          {item.weight && <p className="mt-0.5 text-sm text-ink/65">{item.weight}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          aria-label={`Премахни ${item.name} от количката`}
                          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft/70 transition-colors hover:text-terracotta"
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <QuantityStepper id={item.id} name={item.name} quantity={item.quantity} />
                        <span className="text-sm font-semibold text-terracotta">
                          {formatCents(item.price * item.quantity)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-line bg-cream-soft px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-soft">Междинна сума</dt>
                      <dd>{formatCents(totals.subtotalCents)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-soft">Доставка</dt>
                      {/* ПОТВЪРДИ С КЛИЕНТА: цената идва от siteConfig.ordering.deliveryFeeCents */}
                      <dd className="text-right">
                        {totals.deliveryCents === null
                          ? "Уточнява се по телефона"
                          : formatCents(totals.deliveryCents)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                      <dt>Общо</dt>
                      <dd>{formatCents(totals.totalCents)}</dd>
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
                      Продължи към поръчка
                    </button>
                  ) : (
                    <Link
                      href="/porachka"
                      onClick={closeCart}
                      className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-terracotta text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
                    >
                      Продължи към поръчка
                    </Link>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
