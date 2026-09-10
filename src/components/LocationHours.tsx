import { ScrollReveal } from "./ScrollReveal";
import { siteConfig } from "@/lib/site-config";

export function LocationHours() {
  return (
    <section id="contact" className="bg-cream-soft py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <ScrollReveal>
              <h2 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">
                Как да ни намерите
              </h2>

              <dl className="mt-8 space-y-6">
                <div>
                  <dt className="text-sm font-semibold uppercase tracking-wide text-ink-soft/70">
                    Адрес
                  </dt>
                  <dd className="mt-1 text-ink-soft">{siteConfig.contact.address}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold uppercase tracking-wide text-ink-soft/70">
                    Работно време
                  </dt>
                  <dd className="mt-1 space-y-1 text-ink-soft">
                    {siteConfig.hours.map((h) => (
                      <div key={h.day} className="flex justify-between gap-6">
                        <span className="whitespace-nowrap">{h.day}</span>
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
                Отвори в Google Maps
              </a>
            </ScrollReveal>
          </div>

          <div className="lg:col-span-7">
            <ScrollReveal delay={0.1} className="h-full min-h-[320px]">
              <iframe
                title={`Карта — ${siteConfig.name}, ${siteConfig.contact.address}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(siteConfig.contact.address)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full min-h-[320px] w-full rounded-2xl border border-line"
              />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
