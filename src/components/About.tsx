import Image from "next/image";
import { ScrollReveal } from "./ScrollReveal";
import { ImageReveal } from "./ImageReveal";
import { getContent } from "@/lib/content";
import type { WeekHours } from "@/lib/hours";
import { earliestOpening, hoursRows } from "@/lib/opening-hours";
import type { Locale } from "@/lib/routes";
import { siteConfig } from "@/lib/site-config";

const icons = [
  // Кошница с продукти
  <path key="basket" d="M6 18h36l-4 20a4 4 0 0 1-4 3H14a4 4 0 0 1-4-3L6 18Zm8 0 8-11m12 11-8-11M17 26v8m7-8v8m7-8v8" />,
  // Купа с пара
  <g key="bowl">
    <path d="M7 24h34a17 17 0 0 1-34 0Z" />
        <path d="M17 17c0-3 2-3 2-7M24 17c0-3 2-3 2-7M31 17c0-3 2-3 2-7" />
  </g>,
  // Часовник
  <g key="clock">
    <circle cx="24" cy="24" r="17" />
    <path d="M24 14v10l7 5" />
  </g>,
];

export function About({ locale, openingHours }: { locale: Locale; openingHours: WeekHours }) {
  const c = getContent(locale);
  const opens = earliestOpening(openingHours);
  const features = [
    ...c.features,
    ...(opens
      ? [{ title: c.hoursFeatureTitle(opens), text: hoursRows(openingHours, locale).map((r) => `${r.days}: ${r.time}`).join(" · ") }]
      : []),
  ].map((f, i) => ({ ...f, icon: icons[i] }));
  return (
    <section id="about" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <ScrollReveal>
          {/* Същият стил като eyebrow-а в hero, но в terracotta — златистото
              няма достатъчен контраст върху светлия фон. */}
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-terracotta sm:text-sm">
            {c.aboutEyebrow}
          </p>
          <h2 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">
            {c.aboutTitle}
          </h2>
          <p className="mt-5 text-ink-soft leading-relaxed">
            {c.aboutText}
          </p>

          <ul className="mt-8 space-y-5 border-t border-line pt-8">
            {features.map((f) => (
              <li key={f.title} className="flex gap-4">
                <svg
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="mt-0.5 h-8 w-8 shrink-0 text-terracotta"
                >
                  {f.icon}
                </svg>
                <div>
                  <h3 className="font-medium">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="relative isolate aspect-[4/3] overflow-hidden rounded-2xl [transform:translateZ(0)]">
            <ImageReveal className="absolute inset-0">
              <Image
                src={siteConfig.aboutImage.url}
                alt={c.aboutImageAlt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-right"
              />
            </ImageReveal>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
