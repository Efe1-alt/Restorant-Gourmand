"use client";

import { useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { UtensilsCrossed, X } from "lucide-react";
import { lunchDays, type MenuEntry } from "@/data/menu";
import { menuImage } from "@/data/menu/images";
import { useModal } from "@/lib/use-modal";
import { AddToCartButton } from "./AddToCartButton";

const noopSubscribe = () => () => {};

// Прозорец с голяма снимка и описание на ястието. Рендира се в document.body
// (portal), защото редовете в менюто са в анимирани контейнери с transform,
// в които position: fixed не работи спрямо екрана.
export function DishDialog({
  entry,
  open,
  onClose,
}: {
  entry: MenuEntry;
  open: boolean;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModal(open, onClose, panelRef, closeRef);

  if (!mounted) return null;

  const { item } = entry;
  const src = menuImage(entry);
  const day = entry.day ? lunchDays.find((d) => d.id === entry.day) : undefined;
  const titleId = `dish-${entry.id}`;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-ink/50"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:max-w-lg sm:rounded-3xl"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Затвори"
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-cream/90 text-ink shadow-md backdrop-blur-sm transition-colors hover:text-terracotta"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto">
              {/* Снимката запълва цялото поле (с изрязване по краищата). */}
              {src ? (
                <div className="relative aspect-[4/3] max-h-[60vh] w-full overflow-hidden bg-cream-soft">
                  <Image
                    src={src}
                    alt={item.name}
                    fill
                    sizes="(min-width: 640px) 512px, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  aria-hidden
                  className="flex h-40 w-full items-center justify-center bg-cream-soft text-ink-soft/25"
                >
                  <UtensilsCrossed className="h-12 w-12" strokeWidth={1.25} />
                </div>
              )}

              <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft/70">
                  {entry.category}
                  {day && ` · ${day.name}`}
                </p>
                <h2 id={titleId} className="mt-2 text-balance text-2xl font-medium leading-snug">
                  {item.name}
                </h2>
                {item.weight && <p className="mt-1 text-sm text-ink/65">{item.weight}</p>}
                {item.description && (
                  <p className="mt-4 leading-relaxed text-ink-soft">{item.description}</p>
                )}

                <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5">
                  <span className="text-lg font-semibold text-terracotta">{item.price}</span>
                  <AddToCartButton entry={entry} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
