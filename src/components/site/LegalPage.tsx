import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { PageFrame } from "./PageFrame";

// DRAFTS. Wording must be confirmed by the owner (and ideally a lawyer)
// before launch. Items in [square brackets] are facts we don't have yet.

type Section = { h: string; p: string[] };
type Doc = { title: string; description: string; updated: string; sections: Section[] };

const phone = siteConfig.contact.phone;

const DOCS: Record<"privacy" | "terms", Record<Locale, Doc>> = {
  privacy: {
    bg: {
      title: "Политика за поверителност",
      description: "Как Gourmand Пловдив обработва личните данни при онлайн поръчки.",
      updated: "Чернова от 20.10.2026",
      sections: [
        { h: "Кой обработва данните", p: [`[Юридическо лице, ЕИК — да се попълни], търговско име Gourmand, ${siteConfig.contact.address}. Телефон: ${phone}. Имейл: [да се попълни].`] },
        { h: "Какви данни събираме", p: ["При поръчка: име, телефон, по избор имейл, адрес и квартал за доставка, бележка към поръчката и самата поръчка (ястия, суми, начин на плащане).", "Данни за карти не получаваме: плащането с карта се обработва изцяло от Stripe."] },
        { h: "Защо и на какво основание", p: ["За да изпълним поръчката ви, да се свържем с вас за нея и да ви изпратим известия за статуса ѝ (чл. 6, ал. 1, б. „б“ от ОРЗД — изпълнение на договор).", "За защита срещу злоупотреби ограничаваме броя поръчки от един IP адрес и телефон; пазим само криптографски отпечатък от тях за кратко (законен интерес)."] },
        { h: "Колко дълго пазим данните", p: ["Името, телефонът, адресът, имейлът и бележката се анонимизират автоматично 12 месеца след поръчката. Ястията и сумите остават за счетоводни цели."] },
        { h: "На кого ги предоставяме", p: ["Само на доставчиците, без които сайтът не работи: Supabase (база данни), Vercel (хостинг), Stripe (плащания с карта), Resend (имейли). [Да се потвърди регионът на съхранение — ЕС.]", "Не продаваме данни и не ги използваме за реклама."] },
        { h: "Бисквитки и проследяване", p: ["Сайтът не използва аналитика и рекламни бисквитки. Количката се пази само във вашия браузър. Картата от Google Maps се зарежда едва след като натиснете „Покажи картата“."] },
        { h: "Вашите права", p: ["Имате право на достъп, поправка, изтриване и ограничаване на обработването, както и на възражение. Пишете ни или се обадете на " + phone + ".", "Имате право на жалба до Комисията за защита на личните данни (www.cpdp.bg)."] },
      ],
    },
    en: {
      title: "Privacy policy",
      description: "How Gourmand Plovdiv handles personal data for online orders.",
      updated: "Draft of 20 October 2026",
      sections: [
        { h: "Who handles your data", p: [`[Legal entity and company number — to be added], trading as Gourmand, ${siteConfig.contact.address}. Phone: ${phone}. Email: [to be added].`] },
        { h: "What we collect", p: ["When you order: your name, phone, optionally your email, the delivery address and district, any note, and the order itself (dishes, amounts, payment method).", "We never receive card details: card payments are handled entirely by Stripe."] },
        { h: "Why, and on what basis", p: ["To fulfil your order, contact you about it and send you status updates (GDPR Art. 6(1)(b) — performance of a contract).", "To prevent abuse we limit orders per IP address and phone number, keeping only a short-lived cryptographic fingerprint of them (legitimate interest)."] },
        { h: "How long we keep it", p: ["Your name, phone, address, email and note are anonymised automatically 12 months after the order. Dishes and amounts are kept for accounting."] },
        { h: "Who we share it with", p: ["Only the providers the site needs to work: Supabase (database), Vercel (hosting), Stripe (card payments), Resend (email). [Storage region to be confirmed — EU.]", "We don't sell data or use it for advertising."] },
        { h: "Cookies and tracking", p: ["The site uses no analytics or advertising cookies. Your basket is stored only in your browser. The Google map loads only after you press “Show the map”."] },
        { h: "Your rights", p: ["You can ask to access, correct or delete your data, restrict its use, or object. Contact us or call " + phone + ".", "You can complain to the Bulgarian Commission for Personal Data Protection (www.cpdp.bg)."] },
      ],
    },
  },
  terms: {
    bg: {
      title: "Общи условия за онлайн поръчки",
      description: "Условия за поръчка, плащане, доставка, отказ и възстановяване на суми в Gourmand Пловдив.",
      updated: "Чернова от 20.10.2026",
      sections: [
        { h: "Поръчки", p: ["Онлайн поръчки се приемат само за днес, в часовете за поръчки, показани на сайта. Можете да изберете „Възможно най-скоро“ или 30-минутен интервал.", "Поръчката е приета, когато я потвърдим (статус „Приета“). Ще получите линк към лична страница със статуса ѝ."] },
        { h: "Доставка и вземане", p: ["Доставяме в кварталите от списъка при поръчка; цената на доставката зависи от квартала и се показва преди изпращане. Има минимална сума за доставка и праг за безплатна доставка, показани при поръчка.", "При вземане от ресторанта получавате отстъпка от храната, показана при поръчка."] },
        { h: "Цени и плащане", p: ["Цените са в евро [да се потвърди: с включен ДДС]. Плащане: с карта онлайн, в брой при доставка или в ресторанта при вземане. При доставка не приемаме карти на място.", "При плащане с карта сумата се резервира и се изтегля едва когато приемем поръчката. Ако откажем поръчката, резервацията се освобождава. Фискален бон се издава от ресторанта отделно."] },
        { h: "Отказ и анулиране", p: [`Отказ от поръчка се прави по телефона: ${phone}.`, "Преди да започнем приготвянето: анулираме поръчката и възстановяваме цялата сума, включително доставката.", "След като приготвянето е започнало: ресторантът решава дали и каква сума да възстанови.", "Ако ние не можем да изпълним поръчката: възстановяваме цялата сума. Замяна на ястие правим само с ваше съгласие."] },
        { h: "Възстановяване на суми", p: ["Суми се възстановяват по картата, с която е платено. Обикновено се появяват по сметката до 5–10 работни дни."] },
        { h: "Алергени", p: ["Информацията за алергени се попълва постепенно. Ако имате алергия, обадете ни се преди да поръчате."] },
        { h: "Програма за лоялност", p: ["Клубът „Лоялен клиент“ от предишната платформа за поръчки не продължава в този сайт. [Формулировката да се потвърди от собственика.]"] },
        { h: "Контакт и жалби", p: [`${siteConfig.contact.address}, ${phone}. Можете да се обърнете и към Комисията за защита на потребителите (kzp.bg).`] },
      ],
    },
    en: {
      title: "Terms for online orders",
      description: "Ordering, payment, delivery, cancellation and refund terms at Gourmand Plovdiv.",
      updated: "Draft of 20 October 2026",
      sections: [
        { h: "Orders", p: ["Online orders are for today only, during the ordering hours shown on the site. Choose “As soon as possible” or a 30-minute slot.", "Your order is confirmed once we accept it (status “Accepted”). You'll get a link to a private page that shows its status."] },
        { h: "Delivery and pickup", p: ["We deliver to the districts listed at checkout; the delivery fee depends on the district and is shown before you order. A minimum order for delivery and a free-delivery threshold are shown at checkout.", "If you pick up from the restaurant, you get the discount on food shown at checkout."] },
        { h: "Prices and payment", p: ["Prices are in euros [to be confirmed: VAT included]. Pay by card online, in cash on delivery, or at the restaurant when you pick up. We can't take cards at the door.", "With card payment the amount is reserved and only taken once we accept your order. If we decline it, the reservation is released. The restaurant issues the fiscal receipt separately."] },
        { h: "Cancelling", p: [`To cancel, call us on ${phone}.`, "Before we start preparing: we cancel the order and refund everything, delivery included.", "Once preparation has started: the restaurant decides whether and how much to refund.", "If we can't fulfil your order: we refund everything. We only substitute a dish with your consent."] },
        { h: "Refunds", p: ["Refunds go back to the card you paid with and usually appear within 5–10 business days."] },
        { h: "Allergens", p: ["Allergen information is being added. If you have an allergy, please call us before ordering."] },
        { h: "Loyalty programme", p: ["The “Loyal Customer” club from the previous ordering platform does not continue on this site. [Wording to be confirmed by the owner.]"] },
        { h: "Contact and complaints", p: [`${siteConfig.contact.address}, ${phone}. You can also contact the Bulgarian Consumer Protection Commission (kzp.bg).`] },
      ],
    },
  },
};

export function legalMetadata(kind: "privacy" | "terms", locale: Locale): Metadata {
  const doc = DOCS[kind][locale];
  return pageMetadata(kind, locale, `${doc.title} — Gourmand`, doc.description);
}

export async function LegalPage({ kind, locale }: { kind: "privacy" | "terms"; locale: Locale }) {
  const doc = DOCS[kind][locale];
  return (
    <PageFrame locale={locale}>
      <article className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <p role="note" className="rounded-xl border border-gold/60 bg-cream-soft px-5 py-3 text-sm text-ink-soft">
          {getDictionary(locale).legal.draft}
        </p>
        <h1 className="mt-8 text-balance text-3xl font-medium leading-tight sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{doc.updated}</p>
        {doc.sections.map((s) => (
          <section key={s.h} className="mt-10">
            <h2 className="text-xl font-medium">{s.h}</h2>
            {s.p.map((p) => (
              <p key={p} className="mt-3 leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </PageFrame>
  );
}
