"use client";

import { useCart } from "@/lib/cart";
import { MAX_QTY } from "@/lib/ordering";

const steppers = {
  md: "flex h-11 w-11 items-center justify-center rounded-full text-base leading-none text-terracotta transition-colors duration-200 hover:bg-terracotta hover:text-cream disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8",
  // Количката: 32px навсякъде — ::after разширява зоната за докосване до 44px.
  sm: "relative flex h-[30px] w-[30px] items-center justify-center rounded-full text-base leading-none text-terracotta transition-colors duration-200 after:absolute after:-inset-1.5 after:content-[''] hover:bg-terracotta hover:text-cream disabled:cursor-not-allowed disabled:opacity-40",
};

// [ − ] 2 [ + ] — при 0 ястието излиза от количката.
export function QuantityStepper({
  id,
  name,
  quantity,
  size = "md",
}: {
  id: string;
  name: string;
  quantity: number;
  size?: keyof typeof steppers;
}) {
  const { setQuantity } = useCart();
  const stepper = steppers[size];
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-terracotta">
      <button
        type="button"
        onClick={() => setQuantity(id, quantity - 1)}
        aria-label={`Намали количеството на ${name}`}
        className={stepper}
      >
        −
      </button>
      <span aria-live="polite" className="min-w-5 text-center text-sm font-semibold text-terracotta">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(id, quantity + 1)}
        disabled={quantity >= MAX_QTY}
        aria-label={`Увеличи количеството на ${name}`}
        className={stepper}
      >
        +
      </button>
    </div>
  );
}
