"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { siteConfig } from "@/lib/site-config";

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] w-full items-center overflow-hidden bg-ink"
    >
      <div
        className="absolute inset-0"
        style={{ transform: siteConfig.heroImage.flipped ? "scaleX(-1)" : undefined }}
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
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: siteConfig.heroImage.objectPosition }}
          />
        </motion.div>
      </div>

      {/* Cinematic color grading — топъl overlay в highlight-ите, без да
          удавя наситеността на храната (blend mode, не плътен цвят). */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7a3f14]/25 via-transparent to-transparent mix-blend-overlay" />
      {/* Основен тъмен overlay — равномерен, лек, за общ cinematic тон. */}
      <div className="absolute inset-0 bg-black/20" />
      {/* По-тъмен градиент отляво, където сяда текстът. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
      {/* Лек bottom градиент — грундира секцията към следващата отдолу. */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />

      <div className="relative z-10 w-full py-28">
        <div className="w-full max-w-xl pl-[8%] pr-6 sm:max-w-2xl sm:pl-[10%] lg:max-w-none lg:pl-[10%] lg:pr-8 xl:pl-[12%] xl:pr-16">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="hero-text-shadow mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold sm:text-[13px]"
          >
            {siteConfig.heroEyebrow}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="hero-text-shadow font-serif-heading text-[38px] font-medium leading-[0.94] text-white sm:text-[45px] lg:text-[50px] xl:text-[58px] 2xl:text-[72px]"
          >
            {siteConfig.heroHeadlineLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="hero-text-shadow mt-6 max-w-2xl text-balance text-[15px] leading-relaxed text-white/80 sm:text-[17px]"
          >
            {siteConfig.heroDescription}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <a
              href="/menu"
              className="rounded-full bg-terracotta px-8 py-4 text-sm font-semibold text-cream shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-terracotta-dark hover:shadow-xl"
            >
              Поръчай онлайн
            </a>
            <a
              href="/menu"
              className="hero-text-shadow group inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors duration-300 hover:text-gold"
            >
              Виж менюто
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
