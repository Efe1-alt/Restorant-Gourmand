"use client";

import { useCart } from "@/lib/cart";
import { useT } from "@/lib/locale-context";
import { MAX_QTY } from "@/lib/validation";

const steppers = {
  md: "flex h-11 w-11 items-center justify-center rounded-full text-base leading-none text-terracotta transition-colors duration-200 hover:bg-terracotta hover:text-cream disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8",
  // Количката: 32px навсякъде — ::after разширява зоната за докосване до 44px.
  sm: "relative flex h-[30px] w-[30px] items-center justify-center rounded-full text-base leading-none text-terracotta transition-colors duration-200 after:absolute after:-inset-1.5 after:content-[''] hover:bg-terracotta hover:text-cream disabled:cursor-not-allowed disabled:opacity-40",
};

// [ − ] 2 [ + ] — при 0 ястието излиза от количката.
export function QuantityStepper({
  dishId,
  name,
  quantity,
  max,
  size = "md",
}: {
  dishId: number;
  name: string;
  quantity: number;
  max: number | null;
  size?: keyof typeof steppers;
}) {
  const { setQuantity } = useCart();
  const t = useT().menu;
  const stepper = steppers[size];
  const limit = Math.min(MAX_QTY, max ?? MAX_QTY);
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-terracotta">
      <button type="button" onClick={() => setQuantity(dishId, quantity - 1)} aria-label={t.decrease(name)} className={stepper}>
        −
      </button>
      <span aria-live="polite" className="min-w-5 text-center text-sm font-semibold text-terracotta">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(dishId, quantity + 1)}
        disabled={quantity >= limit}
        aria-label={t.increase(name)}
        className={stepper}
      >
        +
      </button>
    </div>
  );
}
