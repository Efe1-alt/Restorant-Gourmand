"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { PublicDish } from "./catalog-types";
import { sofiaNow } from "./time";
import { MAX_QTY } from "./validation";

// The basket lives in the browser (localStorage) so it survives a reload, a
// switch of language or a cancelled card payment. Prices here are for display
// only: the server recalculates everything from the database.
export type CartItem = {
  dishId: number;
  name: string;
  weight: string;
  priceCents: number;
  image: string | null;
  kind: PublicDish["kind"];
  quantity: number;
  // Portions left when added (null = no limit). The server has the final word.
  max: number | null;
};

type State = { items: CartItem[]; isOpen: boolean; loaded: boolean; staleRemoved: boolean };

type Action =
  | { type: "load"; items: CartItem[]; staleRemoved: boolean }
  | { type: "add"; dish: PublicDish }
  | { type: "setQuantity"; dishId: number; quantity: number }
  | { type: "clear" }
  | { type: "open" }
  | { type: "close" }
  | { type: "dismissStale" };

const KEY = "gourmand-cart-v2";

const cap = (item: { max: number | null }, quantity: number) =>
  Math.min(quantity, MAX_QTY, item.max ?? MAX_QTY);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return { ...state, items: action.items, loaded: true, staleRemoved: action.staleRemoved };
    case "add": {
      const { dish } = action;
      const existing = state.items.find((i) => i.dishId === dish.id);
      const max = dish.remaining;
      const items = existing
        ? state.items.map((i) => (i.dishId === dish.id ? { ...i, max, quantity: cap({ max }, i.quantity + 1) } : i))
        : [
            ...state.items,
            {
              dishId: dish.id,
              name: dish.name,
              weight: dish.weight,
              priceCents: dish.priceCents,
              image: dish.image,
              kind: dish.kind,
              quantity: 1,
              max,
            },
          ];
      return { ...state, items };
    }
    case "setQuantity": {
      const items =
        action.quantity <= 0
          ? state.items.filter((i) => i.dishId !== action.dishId)
          : state.items.map((i) => (i.dishId === action.dishId ? { ...i, quantity: cap(i, action.quantity) } : i));
      return { ...state, items };
    }
    case "clear":
      return { ...state, items: [] };
    case "open":
      return { ...state, isOpen: true };
    case "close":
      return { ...state, isOpen: false };
    case "dismissStale":
      return { ...state, staleRemoved: false };
  }
}

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  loaded: boolean;
  staleRemoved: boolean;
  quantityOf: (dishId: number) => number;
  add: (dish: PublicDish) => void;
  setQuantity: (dishId: number, quantity: number) => void;
  remove: (dishId: number) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  dismissStale: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], isOpen: false, loaded: false, staleRemoved: false });
  const savedOn = useRef<string>("");

  // Load once after mount. Lunch dishes are for one day only: a basket saved
  // on another day keeps its standing dishes and drops the lunch ones.
  useEffect(() => {
    const today = sofiaNow().date;
    let items: CartItem[] = [];
    let staleRemoved = false;
    try {
      const raw = window.localStorage.getItem(KEY);
      const saved = raw ? (JSON.parse(raw) as { date?: string; items?: CartItem[] }) : null;
      if (saved && Array.isArray(saved.items)) {
        items = saved.items.filter((i) => typeof i?.dishId === "number" && i.quantity > 0);
        if (saved.date !== today) {
          const kept = items.filter((i) => i.kind === "standing");
          staleRemoved = kept.length < items.length;
          items = kept;
        }
      }
    } catch {}
    savedOn.current = today;
    dispatch({ type: "load", items, staleRemoved });
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ date: savedOn.current || sofiaNow().date, items: state.items }));
    } catch {}
  }, [state.items, state.loaded]);

  const add = useCallback((dish: PublicDish) => dispatch({ type: "add", dish }), []);
  const setQuantity = useCallback(
    (dishId: number, quantity: number) => dispatch({ type: "setQuantity", dishId, quantity }),
    []
  );
  // Stable references: the cart panel uses them in effects.
  const remove = useCallback((dishId: number) => dispatch({ type: "setQuantity", dishId, quantity: 0 }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const openCart = useCallback(() => dispatch({ type: "open" }), []);
  const closeCart = useCallback(() => dispatch({ type: "close" }), []);
  const dismissStale = useCallback(() => dispatch({ type: "dismissStale" }), []);

  const value = useMemo<CartContextValue>(() => {
    const { items } = state;
    return {
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalCents: items.reduce((sum, i) => sum + i.quantity * i.priceCents, 0),
      loaded: state.loaded,
      staleRemoved: state.staleRemoved,
      quantityOf: (dishId) => items.find((i) => i.dishId === dishId)?.quantity ?? 0,
      add,
      setQuantity,
      remove,
      clear,
      isOpen: state.isOpen,
      openCart,
      closeCart,
      dismissStale,
    };
  }, [state, add, setQuantity, remove, clear, openCart, closeCart, dismissStale]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside <CartProvider>");
  return ctx;
}
