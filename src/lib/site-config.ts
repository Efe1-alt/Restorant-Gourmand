// PRIVATE CONCEPT DEMO за outreach към Gourmand (Пловдив) — не е публикуван
// и не се представя никъде като официален сайт, докато собствениците не
// одобрят и не поемат проекта официално.
//
// Gourmand е квартално място за домашна храна в ж.к. „Христо Ботев“ —
// работи през деня, за вкъщи и с доставка.

export const siteConfig = {
  name: "Gourmand",
  tagline: "Домашна храна за вкъщи и с доставка",
  heroEyebrow: "Домашна храна · За вкъщи · Пловдив",
  // Форсирани на точно 2 реда в Hero.tsx — не сливай в едно изречение.
  heroHeadlineLines: ["Сготвено като у дома", "Пристига топло"],
  // \u00a0 държи тирето на първия ред, вместо да започва втория.
  heroDescription:
    "Домашни ястия от истински продукти, приготвени всеки ден\u00a0– за вкъщи, за офиса или на място на ул. „Гевгели“.",

  // Фасадата на Gourmand — тента и неонов надпис над входа.
  heroImage: {
    url: "/hero-storefront.jpg",
    flipped: false,
    // На тесни екрани кропът остава около неона и входа.
    objectPosition: "40% 50%",
  },

  // Залата на Gourmand — зелената стена с бар плот и столчета.
  aboutImage: {
    url: "/gallery/restaurant-interior.jpg",
  },

  galleryImages: [
    "/gallery/chicken-potatoes.jpg",
    "/gallery/salad.jpg",
    "/gallery/pork-cream-sauce.jpg",
    "/gallery/grilled-fish.jpg",
    "/gallery/chicken-vegetables.jpg",
    "/gallery/stuffed-eggplant.jpg",
  ],
  city: "ж.к. „Христо Ботев“, Пловдив",
  cuisine: "Домашна храна",
  positioning: "casual-premium", // над средното, не семеен format
  priceRange: "$$–$$$",

  contact: {
    phone: "087 892 0254",
    // TODO: реален имейл — да се добави, когато клиентът го предостави.
    address: "ул. „Гевгели“ 44, ж.к. „Христо Ботев“, Пловдив",
    mapsUrl:
      "https://www.google.com/maps/place/Gourmand/@42.1307947,24.7468749,17z/data=!3m1!4b1!4m6!3m5!1s0x14acd04d64b4ac27:0x6c5a16e6a896bad0!8m2!3d42.1307947!4d24.7494552!16s%2Fg%2F11g6wbv774",
    facebookUrl: "https://www.facebook.com/gourmandplovdiv",
    instagramUrl: "https://www.instagram.com/gourmand_pld/",
  },

  hours: [
    { day: "Понеделник – Петък", time: "08:00 – 19:00" },
    { day: "Събота", time: "08:00 – 14:30" },
    { day: "Неделя", time: "Почивен ден" },
  ],

  // Същото работно време като hours, но в числа — от него се генерират
  // часовете за поръчка. Индекс = Date.getDay() (0 = неделя), null = затворено.
  // Дръж в синхрон с hours.
  orderHours: [
    null,
    { open: "08:00", close: "19:00" },
    { open: "08:00", close: "19:00" },
    { open: "08:00", close: "19:00" },
    { open: "08:00", close: "19:00" },
    { open: "08:00", close: "19:00" },
    { open: "08:00", close: "14:30" },
  ] as ({ open: string; close: string } | null)[],
  // ПОТВЪРДИ С КЛИЕНТА: работното време за поръчки (orderHours по-горе) и
  // всички стойности тук.
  ordering: {
    // Колко време преди затваряне спираме да приемаме поръчки.
    lastOrderMinutesBeforeClose: 30,
    // Най-ранният час за поръчка "за конкретен час" спрямо сега.
    minLeadMinutes: 45,
    // ПОТВЪРДИ С КЛИЕНТА: цена за доставка в центове (напр. 250 = 2,50 €).
    // null = „Уточнява се по телефона“ и не влиза в общата сума.
    deliveryFeeCents: null as number | null,
    // ПОТВЪРДИ С КЛИЕНТА: минимална сума на поръчката в центове (напр. 1000 =
    // 10,00 €). null = без минимум.
    minOrderCents: null as number | null,
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

  menuPdfUrl: "#", // TODO: линк към пълно меню/PDF

  navigation: [
    { label: "Начало", href: "#home" },
    { label: "За нас", href: "#about" },
    { label: "Меню", href: "/menu" },
    { label: "Галерия", href: "#gallery" },
    { label: "Контакти", href: "#contact" },
  ],
} as const;
