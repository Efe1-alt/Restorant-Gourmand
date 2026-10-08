"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingBasket } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { FacebookIcon, InstagramIcon } from "./SocialIcons";

// Anchor секции (#home, #about, ...) съществуват само на homepage-а. Когато
// сме на друг route (напр. /menu), трябва да сочат обратно към "/#id",
// иначе не правят нищо (няма такъв id на текущата страница).
function resolveHref(href: string, isHome: boolean) {
  if (href.startsWith("#")) return isHome ? href : `/${href}`;
  return href;
}

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navLinks = siteConfig.navigation;
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
        <Link href={resolveHref("#home", isHome)} className="flex items-center">
          <Image
            src="/logo.png"
            alt={siteConfig.name}
            width={645}
            height={300}
            priority
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
                href={resolveHref(item.href, isHome)}
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
          <div className="flex items-center gap-2">
            {[
              { label: "Facebook", href: siteConfig.contact.facebookUrl, Icon: FacebookIcon },
              { label: "Instagram", href: siteConfig.contact.instagramUrl, Icon: InstagramIcon },
            ].map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 hover:-translate-y-0.5 ${
                  light && !open
                    ? "border-white/40 bg-white/10 text-white backdrop-blur-sm hover:border-white hover:bg-white hover:text-terracotta"
                    : "border-line text-ink-soft hover:border-terracotta hover:text-terracotta"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
          {/* TODO: количката — засега без функционалност. */}
          <button
            type="button"
            aria-label="Количка"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-terracotta text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-terracotta-dark hover:shadow-lg hover:shadow-black/10"
          >
            <ShoppingBasket aria-hidden className="h-5 w-5" />
          </button>
          <button
            aria-label="Меню"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-300 lg:hidden ${
              light && !open
                ? "hero-text-shadow border-white/50 text-white"
                : "border-line text-ink"
            }`}
          >
            <span className="sr-only">Отвори меню</span>
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
                  href={resolveHref(item.href, isHome)}
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
