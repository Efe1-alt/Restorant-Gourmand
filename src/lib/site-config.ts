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
    "Домашни ястия от истински продукти, приготвени всеки ден в Пловдив\u00a0– поръчай за вкъщи или офиса, или ги вземи на място от ул. „Гевгели“.",

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
    mapsUrl: "https://maps.google.com/?q=ul.+Gevgeli+44+Plovdiv",
    facebookUrl: "https://www.facebook.com/gourmandplovdiv",
    // TODO: линк към Instagram профила.
    instagramUrl: "#",
  },

  hours: [
    { day: "Понеделник – Петък", time: "10:00 – 18:15" },
    { day: "Събота", time: "10:00 – 14:00" },
    { day: "Неделя", time: "Почивен ден" },
  ],

  // Същото работно време като hours, но в числа — от него се генерират
  // часовете за поръчка. Индекс = Date.getDay() (0 = неделя), null = затворено.
  // Дръж в синхрон с hours.
  orderHours: [
    null,
    { open: "10:00", close: "18:15" },
    { open: "10:00", close: "18:15" },
    { open: "10:00", close: "18:15" },
    { open: "10:00", close: "18:15" },
    { open: "10:00", close: "18:15" },
    { open: "10:00", close: "14:00" },
  ] as ({ open: string; close: string } | null)[],
  ordering: {
    // Колко време преди затваряне спираме да приемаме поръчки.
    lastOrderMinutesBeforeClose: 30,
    // Най-ранният час за поръчка "за конкретен час" спрямо сега.
    minLeadMinutes: 45,
  },

  reviews: {
    title: "Какво казват клиентите ни",
    googleUrl: "https://www.google.com/maps/place/?q=place_id:ChIJJ6y0ZE3QrBQR0LqWqOYWWmw",
    // TODO: реалните имена на авторите.
    testimonials: [
      // Реални отзиви — цитатите са дословни, не преразказ. Подредени от
      // най-дългия към най-краткия (изрично искане).
      // TODO: YMY и Constance G (Google) — могат да заменят картите
      // „Поръчвам за първи път…“ и „Страхотно място…“, когато има точния им текст.
      {
        quote:
          "Най-добрият ресторант за бърза храна в града. Вкусна храна, учтиво обслужване и приятна атмосфера.",
        author: "Клиент от Google",
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
        quote: "Поръчвам за първи път и съм много доволен. Храната е наистина вкусна.",
        author: "Клиент от Google",
        rating: 5,
      },
      {
        quote: "Страхотно място с перфектно обслужване и вкусна храна.",
        author: "Клиент от Google",
        rating: 5,
      },
      {
        quote: "Всичко е идвало топло и вкусно.",
        author: "Zlatko P",
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
