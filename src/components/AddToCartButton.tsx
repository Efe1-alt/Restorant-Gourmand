"use client";

import { useEffect, useState } from "react";
import type { PublicDish } from "@/lib/catalog-types";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/locale-context";
import { QuantityStepper } from "./QuantityStepper";

const pills = {
  md: "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-colors duration-200 sm:min-h-8 sm:px-3.5",
  // Страницата „Меню“: 32px (34px от sm) — ::after разширява зоната за
  // докосване до 44px на телефон.
  compact:
    "relative inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-200 after:absolute after:-inset-x-0 after:-inset-y-1.5 after:content-[''] sm:h-[34px] sm:after:hidden",
};

// „+ Добави“ → кратко „✓ Добавено“ → брояч [ − ] 2 [ + ]. Ястия, които днес не
// се продават (друг ден от седмицата, изчерпани), показват етикет вместо бутон.
export function AddToCartButton({
  dish,
  size = "md",
  unavailableLabel,
}: {
  dish: PublicDish;
  size?: keyof typeof pills;
  unavailableLabel?: string;
}) {
  const pill = pills[size];
  const t = useT().menu;
  const { add, quantityOf, loaded } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const quantity = quantityOf(dish.id);

  useEffect(() => {
    if (!justAdded) return;
    const id = window.setTimeout(() => setJustAdded(false), 900);
    return () => window.clearTimeout(id);
  }, [justAdded]);

  if (!dish.orderable) {
    return (
      <span aria-disabled="true" className={`${pill} cursor-not-allowed border border-line text-ink-soft/70`}>
        {unavailableLabel ?? (dish.remaining === 0 ? t.soldOut : t.unavailable)}
      </span>
    );
  }

  if (justAdded) {
    return (
      <span role="status" className={`${pill} bg-olive text-cream`}>
        {t.added}
      </span>
    );
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        disabled={!loaded}
        onClick={() => {
          add(dish);
          setJustAdded(true);
        }}
        aria-label={t.addAria(dish.name)}
        className={`${pill} border border-line text-ink-soft hover:border-terracotta hover:text-terracotta disabled:cursor-wait disabled:opacity-60`}
      >
        {t.add}
      </button>
    );
  }

  return <QuantityStepper dishId={dish.id} name={dish.name} quantity={quantity} max={dish.remaining} />;
}
