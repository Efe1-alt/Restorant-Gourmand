import { siteConfig } from "@/lib/site-config";
import { FacebookIcon, InstagramIcon } from "./SocialIcons";

export function Footer() {
  return (
    <footer className="border-t border-line bg-cream py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-serif-heading text-xl">{siteConfig.name}</p>
            <p className="mt-2 text-sm text-ink-soft">{siteConfig.tagline}</p>
            <div className="mt-3 flex items-center gap-3">
              <a
                href={siteConfig.contact.facebookUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="-m-2.5 p-2.5 text-ink-soft transition-colors hover:text-terracotta"
              >
                <FacebookIcon className="h-5 w-5" />
              </a>
              <a
                href={siteConfig.contact.instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="-m-2.5 p-2.5 text-ink-soft transition-colors hover:text-terracotta"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-soft/70">
              Контакт
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
              <li><a href={`tel:${siteConfig.contact.phone}`} className="hover:text-terracotta">{siteConfig.contact.phone}</a></li>
              <li>{siteConfig.contact.address}</li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-soft/70">
              Работно време
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
              {siteConfig.hours.map((h) => (
                <li key={h.day} className="flex justify-between gap-4">
                  <span className="whitespace-nowrap">{h.day}</span>
                  <span className="whitespace-nowrap">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-12 text-xs text-ink-soft/60">
          © {new Date().getFullYear()} {siteConfig.name}. Всички права запазени.
        </p>
      </div>
    </footer>
  );
}
