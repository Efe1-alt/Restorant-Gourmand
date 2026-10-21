"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicDish, ShopConfig } from "./catalog-types";

type Shop = { config: ShopConfig; suggestions: PublicDish[] };

const ShopContext = createContext<Shop | null>(null);

export function ShopProvider({ value, children }: { value: Shop; children: ReactNode }) {
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be inside <ShopProvider>");
  return ctx;
}
