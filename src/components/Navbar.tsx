"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingBasket } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { useCart } from "@/lib/cart";
import { useLocale, useT } from "@/lib/locale-context";
import { href as routeHref, switchLocalePath } from "@/lib/routes";

// Anchor секции (#home, #about, ...) съществуват само на началната страница.
// От друг route сочат обратно към "/#id" ("/en#id" на английски).
function resolveHref(href: string, isHome: boolean, home: string) {
  if (href.startsWith("#")) return isHome ? href : `${home === "/" ? "" : home}/${href}`.replace("//", "/");
  return href;
}

export function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useT().nav;
  const home = routeHref("home", locale);
  const isHome = pathname === home;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { count, openCart } = useCart();
  const navLinks = [
    { label: t.home, href: "#home" },
    { label: t.about, href: "#about" },
    { label: t.menu, href: routeHref("menu", locale) },
    { label: t.gallery, href: "#gallery" },
    { label: t.contact, href: "#contact" },
  ];
  const otherLocale = locale === "bg" ? "en" : "bg";
  // Прозрачен navbar с бял текст важи само за hero-а на homepage-а, преди
  // скрол. Всеки друг route няма full-bleed тъмна снимка зад navbar-а.
  const light = isHome && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        light
          ? "border-b border-transparent bg-transparent"
          : "border-b border-line bg-cream/95 shadow-sm backdrop-blur-sm"
      }`}
    >
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href={resolveHref("#home", isHome, home)} className="flex items-center">
          <Image
            src="/logo.png"
            alt={siteConfig.name}
            width={645}
            height={300}
            preload
            className="h-11 w-auto lg:h-14"
          />
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 lg:flex lg:items-center lg:gap-10">
          {navLinks.map((item) => {
            const isRoute = !item.href.startsWith("#");
            const active = isRoute && pathname === item.href;
            return (
              <Link
                key={item.href}
                href={resolveHref(item.href, isHome, home)}
                className={`group relative text-[13px] font-medium uppercase tracking-[0.08em] transition-colors duration-300 ${
                  light ? "hero-text-shadow text-white/85 hover:text-white" : "text-ink-soft hover:text-ink"
                } ${active ? "text-terracotta" : ""}`}
              >
                {item.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={switchLocalePath(pathname, otherLocale)}
            hrefLang={otherLocale}
            lang={otherLocale}
            aria-label={t.otherLanguage}
            className={`flex h-11 min-w-11 items-center justify-center rounded-full border px-3 text-xs font-semibold tracking-wide transition-colors duration-300 ${
              light ? "hero-text-shadow border-white/50 text-white hover:border-white" : "border-line text-ink-soft hover:border-terracotta hover:text-terracotta"
            }`}
          >
            {t.otherLanguageShort}
          </a>
          <button
            type="button"
            onClick={openCart}
            aria-label={count > 0 ? t.cartWithCount(count) : t.cart}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-terracotta text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-terracotta-dark hover:shadow-lg hover:shadow-black/10"
          >
            <ShoppingBasket aria-hidden className="h-5 w-5" />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta-dark px-1 text-[11px] font-bold leading-none text-cream ring-2 ring-cream"
              >
                {count}
              </span>
            )}
          </button>
          <button
            aria-label={t.menuButton}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-300 lg:hidden ${
              light && !open
                ? "hero-text-shadow border-white/50 text-white"
                : "border-line text-ink"
            }`}
          >
            <span className="sr-only">{t.openMenu}</span>
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line bg-cream px-5 pb-5 pt-2 lg:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={resolveHref(item.href, isHome, home)}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-3 text-base text-ink-soft hover:bg-cream-soft hover:text-terracotta"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </motion.header>
  );
}
