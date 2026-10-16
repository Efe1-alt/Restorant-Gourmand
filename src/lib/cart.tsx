"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { MenuEntry } from "@/data/menu";
import { MAX_QTY, parsePriceCents } from "./ordering";

// Количката живее само в паметта на страницата — при презареждане се изчиства.
// Към сървъра отива чак при изпращане на поръчката, където цените се
// преизчисляват наново.
export type CartItem = {
  id: string;
  name: string;
  weight: string;
  // в центове
  price: number;
  quantity: number;
  category: string;
  // Само за обедното меню: id на деня ("mon"…"sat").
  day?: string;
};

type State = {
  items: CartItem[];
  isOpen: boolean;
};

type Action =
  | { type: "add"; item: CartItem }
  | { type: "setQuantity"; id: string; quantity: number }
  | { type: "clear" }
  | { type: "open" }
  | { type: "close" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add": {
      const existing = state.items.find((i) => i.id === action.item.id);
      const items = existing
        ? state.items.map((i) =>
            i.id === action.item.id ? { ...i, quantity: Math.min(i.quantity + 1, MAX_QTY) } : i
          )
        : [...state.items, action.item];
      return { ...state, items };
    }
    case "setQuantity": {
      const quantity = Math.min(action.quantity, MAX_QTY);
      const items =
        quantity <= 0
          ? state.items.filter((i) => i.id !== action.id)
          : state.items.map((i) => (i.id === action.id ? { ...i, quantity } : i));
      return { ...state, items };
    }
    case "clear":
      return { ...state, items: [] };
    case "open":
      return { ...state, isOpen: true };
    case "close":
      return { ...state, isOpen: false };
  }
}

export function cartItemFromEntry(entry: MenuEntry): CartItem | null {
  const price = parsePriceCents(entry.item.price);
  if (price === null) return null;
  return {
    id: entry.id,
    name: entry.item.name,
    weight: entry.item.weight,
    price,
    quantity: 1,
    category: entry.category,
    ...(entry.day ? { day: entry.day } : {}),
  };
}

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  quantityOf: (id: string) => number;
  add: (entry: MenuEntry) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    isOpen: false,
  });

  const add = useCallback((entry: MenuEntry) => {
    const item = cartItemFromEntry(entry);
    if (item) dispatch({ type: "add", item });
  }, []);
  const setQuantity = useCallback(
    (id: string, quantity: number) => dispatch({ type: "setQuantity", id, quantity }),
    []
  );
  // Стабилни референции — панелът на количката ги ползва в useEffect и не
  // трябва да се пре-инициализира (и да мести фокуса) при всяка промяна.
  const remove = useCallback((id: string) => dispatch({ type: "setQuantity", id, quantity: 0 }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const openCart = useCallback(() => dispatch({ type: "open" }), []);
  const closeCart = useCallback(() => dispatch({ type: "close" }), []);

  const value = useMemo<CartContextValue>(() => {
    const { items } = state;
    return {
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalCents: items.reduce((sum, i) => sum + i.quantity * i.price, 0),
      quantityOf: (id) => items.find((i) => i.id === id)?.quantity ?? 0,
      add,
      setQuantity,
      remove,
      clear,
      isOpen: state.isOpen,
      openCart,
      closeCart,
    };
  }, [state, add, setQuantity, remove, clear, openCart, closeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart трябва да е вътре в <CartProvider>");
  return ctx;
}
