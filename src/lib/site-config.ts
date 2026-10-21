// Gourmand (Пловдив) — business details used across the site. Opening and
// ordering hours, delivery fees and other ordering rules live in the database
// and are edited in the admin. Marketing copy per language: src/lib/content.ts.
//
// ПОТВЪРДИ С КЛИЕНТА преди пускане: адрес и телефон (docs/backend-scope.md).
// Structured data (JSON-LD) is built only from the fields below.

export const siteConfig = {
  name: "Gourmand",
  city: "Пловдив",
  cuisine: "Домашна храна",

  // Фасадата на Gourmand — тента и неонов надпис над входа.
  heroImage: {
    url: "/hero-storefront.jpg",
    // На тесни екрани кропът остава около неона и входа.
    objectPosition: "40% 50%",
  },
  // Залата на Gourmand — зелената стена с бар плот и столчета.
  aboutImage: { url: "/gallery/restaurant-interior.jpg" },

  contact: {
    phone: "087 892 0254",
    // E.164 for tel: links and structured data.
    phoneE164: "+359878920254",
    address: "ул. „Гевгели“ 44, Пловдив (до Събота пазар)",
    streetAddress: "ул. „Гевгели“ 44",
    addressLocality: "Пловдив",
    addressCountry: "BG",
    mapsQuery: "ул. Гевгели 44, Пловдив",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=%D1%83%D0%BB.%20%D0%93%D0%B5%D0%B2%D0%B3%D0%B5%D0%BB%D0%B8%2044%2C%20%D0%9F%D0%BB%D0%BE%D0%B2%D0%B4%D0%B8%D0%B2",
    facebookUrl: "https://www.facebook.com/gourmandplovdiv",
    instagramUrl: "https://www.instagram.com/gourmand_pld/",
  },

  reviews: {
    title: "Какво казват клиентите ни",
    googleUrl: "https://www.google.com/maps/place/?q=place_id:ChIJJ6y0ZE3QrBQR0LqWqOYWWmw",
    testimonials: [
      // Реални отзиви от Google Maps (+ един от opoznai.bg) — цитатите са
      // дословни, „…“ = пропуснат текст. Подредени от най-дългия към
      // най-краткия (изрично искане).
      {
        quote:
          "Доста често си поръчвам храна за вкъщи от тях и абсолютно винаги, всичко е идвало топло и вкусно. Всичко е било приготвено добре. Изглежда като да работят с истински продукти, например картофеното пюре не е на прах и усещаш картофите в него :)",
        author: "Zlatko Petrov · Google",
        rating: 5,
      },
      {
        quote:
          "Най добрия ресторант за бързо хранене в града. Вкусна храна, учтиво обслужване и добра обстановка. Препоръчвам на всеки който иска да похапне нещо различно да опита храната.",
        author: "Ivaylo Naydenov · Google",
        rating: 5,
      },
      {
        quote:
          "Храната е много вкусна. … За пръв път поръчвам от тук и съм адски доволен.",
        author: "Ngl · Google",
        rating: 5,
      },
      {
        // opoznai.bg, 2018 — датата нарочно не се показва.
        quote:
          "Много чисто заведение, всеки ден разнообразна и вкусно сготвена храна, учтив персонал.",
        author: "Rositsa · opoznai.bg",
        rating: 5,
      },
      {
        quote: "Много вкусна храна и добро обслужване, какво повече да иска човек!!))",
        author: "Ася Джарова",
        rating: 5,
      },
      {
        quote: "Страхотно местенце с перфектно обслужване и вкусна храна.",
        author: "Elitsa Fotinu · Google",
        rating: 5,
      },
    ],
  },

} as const;
