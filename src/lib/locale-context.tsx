"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getDictionary } from "./i18n";
import type { Locale } from "./routes";

const LocaleContext = createContext<Locale>("bg");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  return getDictionary(useContext(LocaleContext));
}
