import Link from "next/link";
import type { WeekHours } from "@/lib/hours";
import { getContent } from "@/lib/content";
import { getDictionary } from "@/lib/i18n";
import { hoursRows } from "@/lib/opening-hours";
import { href, type Locale } from "@/lib/routes";
import { siteConfig } from "@/lib/site-config";
import { FacebookIcon, InstagramIcon } from "./SocialIcons";

export function Footer({ locale, openingHours }: { locale: Locale; openingHours: WeekHours }) {
  const t = getDictionary(locale).footer;
  const c = getContent(locale);
  return (
    <footer className="border-t border-line bg-cream py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-serif-heading text-xl">{siteConfig.name}</p>
            <p className="mt-2 text-sm text-ink-soft">{c.tagline}</p>
            <div className="mt-3 flex items-center gap-3">
              <a href={siteConfig.contact.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook" className="-m-2.5 p-2.5 text-ink-soft transition-colors hover:text-terracotta">
                <FacebookIcon className="h-5 w-5" />
              </a>
              <a href={siteConfig.contact.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="-m-2.5 p-2.5 text-ink-soft transition-colors hover:text-terracotta">
                <InstagramIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-soft/70">{t.contact}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
              <li>
                <a href={`tel:${siteConfig.contact.phoneE164}`} className="hover:text-terracotta">
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li>{c.address}</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-soft/70">{t.hours}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
              {hoursRows(openingHours, locale).map((h) => (
                <li key={h.days} className="flex justify-between gap-4">
                  <span className="whitespace-nowrap">{h.days}</span>
                  <span className="whitespace-nowrap">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 text-xs text-ink-soft/70">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. {t.rights}
          </p>
          <nav className="flex gap-5">
            <Link href={href("privacy", locale)} className="hover:text-terracotta">
              {t.privacy}
            </Link>
            <Link href={href("terms", locale)} className="hover:text-terracotta">
              {t.terms}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
