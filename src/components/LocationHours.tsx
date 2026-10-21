import type { WeekHours } from "@/lib/hours";
import { getContent } from "@/lib/content";
import { getDictionary } from "@/lib/i18n";
import { hoursRows } from "@/lib/opening-hours";
import type { Locale } from "@/lib/routes";
import { siteConfig } from "@/lib/site-config";
import { ClickToLoadMap } from "./ClickToLoadMap";
import { ScrollReveal } from "./ScrollReveal";

export function LocationHours({ locale, openingHours }: { locale: Locale; openingHours: WeekHours }) {
  const t = getDictionary(locale).location;
  const { address } = getContent(locale);
  return (
    <section id="contact" className="bg-cream-soft py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <ScrollReveal>
              <h2 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">{t.title}</h2>
              <dl className="mt-8 space-y-6">
                <div>
                  <dt className="text-sm font-semibold uppercase tracking-wide text-ink-soft/70">{t.address}</dt>
                  <dd className="mt-1 text-ink-soft">{address}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold uppercase tracking-wide text-ink-soft/70">{t.hours}</dt>
                  <dd className="mt-1 space-y-1 text-ink-soft">
                    {hoursRows(openingHours, locale).map((h) => (
                      <div key={h.days} className="flex justify-between gap-6">
                        <span className="whitespace-nowrap">{h.days}</span>
                        <span className="whitespace-nowrap font-medium text-ink">{h.time}</span>
                      </div>
                    ))}
                  </dd>
                </div>
              </dl>
              <a
                href={siteConfig.contact.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-block rounded-full border border-line px-7 py-3.5 text-sm font-semibold text-ink transition-colors duration-200 hover:border-terracotta hover:text-terracotta"
              >
                {t.openInMaps}
              </a>
            </ScrollReveal>
          </div>
          <div className="lg:col-span-7">
            <ScrollReveal delay={0.1} className="h-full min-h-[320px]">
              <ClickToLoadMap address={address} />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
