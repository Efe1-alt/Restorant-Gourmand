"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { getContent } from "@/lib/content";
import { href, type Locale } from "@/lib/routes";
import { siteConfig } from "@/lib/site-config";

export function Hero({ locale }: { locale: Locale }) {
  const c = getContent(locale);
  const menuHref = href("menu", locale);
  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] w-full items-center overflow-hidden bg-ink"
    >
      <div
        className="absolute inset-0"
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: 1.08 }}
          transition={{ duration: 20, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <Image
            src={siteConfig.heroImage.url}
            alt=""
            fill
            preload
            sizes="100vw"
            className="object-cover"
            style={{
              objectPosition: siteConfig.heroImage.objectPosition,
              filter: "brightness(1.05) contrast(1.05) saturate(1.05)",
            }}
          />
        </motion.div>
      </div>

      {/* Cinematic color grading — топъl overlay в highlight-ите, без да
          удавя наситеността на храната (blend mode, не плътен цвят). */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7a3f14]/25 via-transparent to-transparent mix-blend-overlay" />
      {/* Тъмен градиент само зад текста (отляво), изсветлява надясно.
          Под 640px е с 0.1 по-тъмен — там текстът покрива повече от снимката. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.35)_50%,rgba(0,0,0,0.15)_100%)] sm:bg-[linear-gradient(to_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.25)_50%,rgba(0,0,0,0.05)_100%)]" />
      {/* Лек bottom градиент — грундира секцията към следващата отдолу. */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />

      <div className="relative z-10 w-full py-28">
        <div className="w-full max-w-xl pl-[8%] pr-6 sm:max-w-2xl sm:pl-[10%] lg:max-w-none lg:pl-[10%] lg:pr-8 xl:pl-[12%] xl:pr-16">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="hero-copy-shadow mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold sm:text-[13px]"
          >
            {c.heroEyebrow}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="hero-copy-shadow font-serif-heading text-[length:min(8vw,32px)] font-medium leading-[0.94] text-white sm:text-[45px] lg:text-[50px] xl:text-[58px] 2xl:text-[72px]"
          >
            {c.heroHeadlineLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="hero-desc-shadow mt-6 max-w-2xl text-balance text-[15px] leading-relaxed text-white/90 sm:text-[17px]"
          >
            {c.heroDescription}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <a
              href={menuHref}
              className="rounded-full bg-terracotta px-8 py-4 text-sm font-semibold text-cream shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-terracotta-dark hover:shadow-xl"
            >
              {c.heroOrder}
            </a>
            <a
              href={menuHref}
              className="hero-copy-shadow group inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors duration-300 hover:text-gold"
            >
              {c.heroMenu}
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className="hero-copy-shadow mt-6 inline-flex items-center gap-1.5 text-sm text-white/90"
          >
            {/* Пин за локация */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="h-4 w-4 shrink-0 text-gold"
            >
              <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
            {c.heroLocation}
          </motion.p>
        </div>
      </div>
    </section>
  );
}
