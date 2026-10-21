"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, History, Inbox, LogOut, Mail, Settings, Shield, Soup, CalendarDays, LayoutTemplate, Tags } from "lucide-react";
import { browserClient } from "@/lib/admin/browser-client";

const LINKS = [
  { href: "/admin", label: "Опашка", icon: Inbox, primary: true },
  { href: "/admin/porachki", label: "Поръчки", icon: ClipboardList, primary: true },
  { href: "/admin/sedmica", label: "Седмица", icon: CalendarDays, primary: true },
  { href: "/admin/menu", label: "Ястия", icon: Soup, primary: true },
  { href: "/admin/shabloni", label: "Шаблони", icon: LayoutTemplate },
  { href: "/admin/kategorii", label: "Категории", icon: Tags },
  { href: "/admin/nastroyki", label: "Настройки", icon: Settings, primary: true },
  { href: "/admin/imeyli", label: "Имейли", icon: Mail },
  { href: "/admin/dnevnik", label: "Дневник", icon: History },
  { href: "/admin/sigurnost", label: "Сигурност", icon: Shield },
];

export function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  async function signOut() {
    await browserClient().auth.signOut();
    router.replace("/admin/vhod");
    router.refresh();
  }

  return (
    <>
      {/* Desktop / tablet landscape: side rail */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-paper px-3 py-6 lg:flex">
        <p className="font-serif-heading px-3 text-2xl text-terracotta">Gourmand</p>
        <p className="px-3 text-xs text-ink-soft">Админ</p>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                active(href) ? "bg-terracotta text-cream" : "text-ink-soft hover:bg-cream-soft hover:text-ink"
              }`}
            >
              <Icon aria-hidden className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line px-3 pt-4 text-xs text-ink-soft">
          <p className="truncate">{email}</p>
          <button type="button" onClick={signOut} className="mt-2 inline-flex min-h-10 items-center gap-2 font-semibold text-ink hover:text-terracotta">
            <LogOut aria-hidden className="h-4 w-4" /> Изход
          </button>
        </div>
      </aside>

      {/* Phone / tablet portrait: top bar with the rest, bottom tab bar with the main five */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-2 backdrop-blur lg:hidden">
        <p className="font-serif-heading text-xl text-terracotta">Gourmand</p>
        <details className="relative">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-xl border border-line px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Още
          </summary>
          <nav className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-paper p-2 shadow-lg">
            {LINKS.filter((l) => !l.primary).map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-cream-soft">
                <Icon aria-hidden className="h-4 w-4" /> {label}
              </Link>
            ))}
            <button type="button" onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm hover:bg-cream-soft">
              <LogOut aria-hidden className="h-4 w-4" /> Изход
            </button>
          </nav>
        </details>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden">
        {LINKS.filter((l) => l.primary).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active(href) ? "text-terracotta" : "text-ink-soft"}`}
          >
            <Icon aria-hidden className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
