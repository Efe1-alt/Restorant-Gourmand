"use client";

import { useEffect, useState } from "react";
import { lunchDays, type MenuEntry } from "@/data/menu";
import { useCart } from "@/lib/cart";
import { todaysLunchDayId } from "@/lib/ordering";
import { useSofiaNow } from "@/lib/use-sofia-now";
import { QuantityStepper } from "./QuantityStepper";

const pill =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-colors duration-200 sm:min-h-8 sm:px-3.5";

// „+ Добави“ → кратко „✓ Добавено“ → брояч [ − ] 2 [ + ]. При 0 се връща в
// „+ Добави“. Ястията от обедното меню се поръчват само в техния ден.
export function AddToCartButton({ entry }: { entry: MenuEntry }) {
  const { add, quantityOf } = useCart();
  const now = useSofiaNow();
  const [justAdded, setJustAdded] = useState(false);
  const quantity = quantityOf(entry.id);
  const name = entry.item.name;

  useEffect(() => {
    if (!justAdded) return;
    const id = window.setTimeout(() => setJustAdded(false), 900);
    return () => window.clearTimeout(id);
  }, [justAdded]);

  if (entry.day) {
    const today = now ? todaysLunchDayId(now) : undefined;
    if (today !== undefined && today !== entry.day) {
      const day = lunchDays.find((d) => d.id === entry.day);
      return (
        <span
          aria-disabled="true"
          className={`${pill} cursor-not-allowed border border-line text-ink-soft/60`}
        >
          {day?.onlyLabel ?? "Не е налично днес"}
        </span>
      );
    }
  }

  // Обедните ястия са неактивни, докато не се знае днешният ден.
  const ready = !entry.day || now !== null;

  if (justAdded) {
    return (
      <span role="status" className={`${pill} bg-olive text-cream`}>
        ✓ Добавено
      </span>
    );
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          add(entry);
          setJustAdded(true);
        }}
        aria-label={`Добави ${name} в количката`}
        className={`${pill} border border-line text-ink-soft hover:border-terracotta hover:text-terracotta disabled:cursor-wait disabled:opacity-60`}
      >
        + Добави
      </button>
    );
  }

  return <QuantityStepper id={entry.id} name={name} quantity={quantity} />;
}
