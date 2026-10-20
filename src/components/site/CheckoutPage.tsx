import { CheckoutForm } from "@/components/CheckoutForm";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/routes";
import { PageFrame } from "./PageFrame";

export async function CheckoutPage({ locale }: { locale: Locale }) {
  return (
    <PageFrame locale={locale}>
      <section className="mx-auto max-w-6xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <h1 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">{getDictionary(locale).checkout.title}</h1>
        <div className="mt-8 sm:mt-10">
          <CheckoutForm />
        </div>
      </section>
    </PageFrame>
  );
}
