"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import type { PublicDish } from "@/lib/catalog-types";
import { localizeWeight } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/locale-context";
import { formatCents } from "@/lib/pricing";
import { AddToCartButton } from "./AddToCartButton";
import { DishDialog } from "./DishDialog";

// Карта на ястие („Меню“ и „От менюто“): снимка 4:3 с цената върху нея, име,
// съставки и долу грамаж + „+ Добави“. Клик върху снимката или името отваря
// прозореца с голямата снимка.
export function DishCard({
  dish,
  className = "",
  unavailableLabel,
}: {
  dish: PublicDish;
  className?: string;
  unavailableLabel?: string;
}) {
  const locale = useLocale();
  const t = useT().menu;
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const openDialog = () => setOpen(true);
  const low = dish.orderable && dish.remaining !== null && dish.remaining <= 5;

  return (
    <article
      data-dish={dish.slug}
      className={`group flex flex-col overflow-hidden rounded-xl bg-paper shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] ${className}`}
    >
      <button
        type="button"
        onClick={openDialog}
        aria-label={t.viewPhoto(dish.name)}
        aria-haspopup="dialog"
        className="relative block aspect-[4/3] w-full overflow-hidden bg-cream-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terracotta"
      >
        {dish.image ? (
          <>
            <Image
              src={dish.image}
              alt={dish.name}
              fill
              sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
              className={`object-cover transition-transform duration-[400ms] group-hover:scale-[1.04] ${dish.orderable ? "" : "grayscale-[35%]"}`}
            />
            {/* Тъмен градиент отдолу, за да се чете цената върху всяка снимка. */}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/55 to-transparent" />
          </>
        ) : (
          <span aria-hidden className="flex h-full w-full items-center justify-center text-ink-soft/35">
            <UtensilsCrossed className="h-14 w-14" strokeWidth={1.25} />
          </span>
        )}
        <span
          className={`font-serif-heading absolute bottom-4 left-4 text-lg font-semibold sm:text-xl ${
            dish.image ? "text-white" : "text-terracotta"
          }`}
        >
          {formatCents(dish.priceCents, locale)}
        </span>
      </button>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-[18px]">
        <h3 title={dish.name} className="text-lg font-medium leading-snug text-ink sm:text-xl">
          <button
            type="button"
            onClick={openDialog}
            aria-haspopup="dialog"
            className="block w-full text-left transition-colors duration-200 hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            <span className="line-clamp-2" lang={dish.untranslated ? "bg" : undefined}>
              {dish.name}
            </span>
          </button>
        </h3>
        {dish.description && (
          <p
            title={dish.description}
            lang={dish.untranslated ? "bg" : undefined}
            className="mt-1.5 line-clamp-2 text-sm italic leading-normal text-ink-soft"
          >
            {dish.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-[13px] text-ink-soft">
            {localizeWeight(dish.weight, locale)}
            {low && <span className="ml-2 font-semibold text-terracotta-dark">{t.left(dish.remaining!)}</span>}
          </span>
          <AddToCartButton dish={dish} size="compact" unavailableLabel={unavailableLabel} />
        </div>
      </div>

      <DishDialog dish={dish} open={open} onClose={close} unavailableLabel={unavailableLabel} />
    </article>
  );
}
