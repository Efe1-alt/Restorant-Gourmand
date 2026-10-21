import { MenuTabs } from "@/components/MenuTabs";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/routes";
import { getMenuView } from "@/lib/server/catalog";
import { PageFrame } from "./PageFrame";

export async function MenuPage({ locale }: { locale: Locale }) {
  const view = await getMenuView(locale);
  return (
    <PageFrame locale={locale}>
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-[124px] sm:px-8 sm:pt-[140px]">
        <h1 className="text-balance text-center text-3xl font-medium leading-tight sm:text-4xl">
          {getDictionary(locale).menu.title}
        </h1>
        <div className="mt-9">
          <MenuTabs view={view} />
        </div>
      </section>
    </PageFrame>
  );
}
