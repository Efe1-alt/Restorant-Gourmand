"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

// Количката живее само в браузъра (localStorage) — в базата влиза чак при
// изпращане на поръчката. Ястията се идентифицират по име, защото менюто в
// site-config няма отделни id-та.
export type CartItem = {
  name: string;
  priceCents: number;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  totalCents: number;
  add: (name: string, priceCents: number) => void;
  setQty: (name: string, qty: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "gourmand-cart";
const MAX_QTY = 20;

const CartContext = createContext<CartContextValue | null>(null);

// Външен store върху localStorage, четен през useSyncExternalStore — така
// сървърът (и първият клиентски render) виждат празна количка без hydration
// разминаване, а промени от друг таб също се отразяват.
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;

function readItems(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedItems = raw ? JSON.parse(raw) : EMPTY;
    } catch {
      cachedItems = EMPTY;
    }
  }
  return cachedItems;
}

function writeItems(items: CartItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Без localStorage (private mode) количката пак работи до reload.
    cachedRaw = null;
    cachedItems = items;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// "4,30 €" → 430. Цените в site-config са текст, за да се показват 1:1.
export function parsePriceCents(price: string) {
  const value = Number.parseFloat(price.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function formatPrice(cents: number) {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, readItems, () => EMPTY);

  function add(name: string, priceCents: number) {
    const existing = items.find((i) => i.name === name);
    writeItems(
      existing
        ? items.map((i) => (i.name === name ? { ...i, qty: Math.min(i.qty + 1, MAX_QTY) } : i))
        : [...items, { name, priceCents, qty: 1 }]
    );
  }

  function setQty(name: string, qty: number) {
    writeItems(
      qty <= 0
        ? items.filter((i) => i.name !== name)
        : items.map((i) => (i.name === name ? { ...i, qty: Math.min(qty, MAX_QTY) } : i))
    );
  }

  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const totalCents = items.reduce((sum, i) => sum + i.qty * i.priceCents, 0);

  return (
    <CartContext.Provider
      value={{ items, count, totalCents, add, setQty, clear: () => writeItems([]) }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart трябва да е вътре в <CartProvider>");
  return ctx;
}
