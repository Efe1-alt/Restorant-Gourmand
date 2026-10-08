"use client";

import { parsePriceCents, useCart } from "@/lib/cart";

export function AddToCartButton({ name, price }: { name: string; price: string }) {
  const { items, add } = useCart();
  const qty = items.find((i) => i.name === name)?.qty ?? 0;

  return (
    <button
      type="button"
      onClick={() => add(name, parsePriceCents(price))}
      aria-label={`Добави ${name} в количката`}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
        qty > 0
          ? "bg-terracotta text-cream hover:bg-terracotta-dark"
          : "border border-line text-ink-soft hover:border-terracotta hover:text-terracotta"
      }`}
    >
      {qty > 0 ? `В количката · ${qty}` : "+ Добави"}
    </button>
  );
}
