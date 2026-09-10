"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollReveal } from "./ScrollReveal";
import { siteConfig } from "@/lib/site-config";

function Stars({ rating, small = false }: { rating: number; small?: boolean }) {
  return (
    <div
      aria-label={`${rating} от 5 звезди`}
      className={`flex gap-1 text-gold ${small ? "text-xs" : ""}`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < Math.round(rating) ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

export function SocialProof() {
  const { rating, count, source, testimonials } = siteConfig.reviews;

  // 3 отзива видими наведнъж на desktop/tablet, 1 на мобилно.
  const [perPage, setPerPage] = useState(3);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setPerPage(mq.matches ? 1 : 3);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const totalPages = Math.ceil(testimonials.length / perPage);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  function goTo(next: number) {
    setDirection(next > page ? 1 : -1);
    setPage((next + totalPages) % totalPages);
  }

  const visible = testimonials.slice(page * perPage, page * perPage + perPage);

  return (
    <section className="bg-ink py-24 text-cream sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal className="flex flex-col items-center text-center">
          <Stars rating={rating} />
          <p className="mt-4 text-2xl font-medium">
            {rating.toFixed(1)} от 5 <span className="text-cream/60">·</span>{" "}
            {count} ревюта в {source}
          </p>
          {/* TODO: свържи с реален Google Places / TripAdvisor рейтинг на Lake House —
              rating/count по-горе са примерни данни, не реални. Testimonials-ите са
              реални цитати от клиенти. Не показвай текст за това на страницата. */}
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="mt-16 flex items-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            aria-label="Предишни отзиви"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream/20 text-cream transition-colors duration-200 hover:border-gold hover:text-gold"
          >
            ←
          </button>

          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={page}
                custom={direction}
                initial={{ x: direction >= 0 ? 48 : -48, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction >= 0 ? -48 : 48, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="grid gap-8 sm:grid-cols-3"
              >
                {visible.map((t) => (
                  <div
                    key={t.author}
                    className="rounded-2xl border border-cream/15 p-6 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20"
                  >
                    <p className="leading-relaxed text-cream/90">&ldquo;{t.quote}&rdquo;</p>
                    <Stars rating={t.rating} small />
                    <p className="mt-2 text-sm font-semibold text-gold">{t.author}</p>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => goTo(page + 1)}
            aria-label="Следващи отзиви"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream/20 text-cream transition-colors duration-200 hover:border-gold hover:text-gold"
          >
            →
          </button>
        </ScrollReveal>

        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Отзиви, страница ${i + 1}`}
              aria-current={i === page}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === page ? "w-6 bg-gold" : "w-1.5 bg-cream/25 hover:bg-cream/40"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
