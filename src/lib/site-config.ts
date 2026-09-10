// PRIVATE CONCEPT DEMO за outreach към Lake House (Пловдив) — не е публикуван
// и не се представя никъде като официален сайт, докато собствениците не
// одобрят и не поемат проекта официално.
//
// hero/about/gallery вече са реални снимки на Lake House.

export const siteConfig = {
  name: "Lake House",
  tagline: "Крайезерен ресторант в Пловдив",
  // Форсирани на точно 2 реда в Hero.tsx — не сливай в едно изречение.
  heroHeadlineLines: ["Вкусът на езерото,", "поднесен по традиция."],
  heroDescription:
    "Прясна риба на скара, домашна кухня и топло гостоприемство на брега на Пловдив.",

  // Реален кадър от Lake House — калмари на дървена маса с лимон (същата
  // снимка е и в галерията).
  heroImage: {
    url: "/gallery/pan-fried-shrimp.jpeg",
    flipped: false,
    objectPosition: "55% 45%",
  },

  // Реална снимка на терасата на Lake House.
  aboutImage: {
    url: "/gallery/restaurant-terrace.jpeg",
  },

  // Реални снимки от кухнята на Lake House.
  galleryImages: [
    "/gallery/grilled-trout.jpeg",
    "/gallery/tomato-burrata-salad.png",
    "/gallery/fried-calamari.png",
    "/gallery/chicken-skewers.png",
    "/gallery/pan-fried-shrimp.jpeg",
    "/gallery/fried-anchovies.jpeg",
  ],
  city: "Гребна база, Пловдив",
  cuisine: "Традиционна българска кухня",
  positioning: "casual-premium", // над средното, не семеен format
  priceRange: "$$–$$$",

  contact: {
    phone: "089 852 7900",
    // TODO: реален имейл — да се добави, когато клиентът го предостави.
    address: "ул. „Ясна поляна“ 2, 4002 Пловдив",
    mapsUrl: "https://maps.google.com/?q=ul.+Yasna+Polyana+2+Plovdiv+4002",
    facebookUrl: "https://www.facebook.com/profile.php?id=61584296742245",
  },

  hours: [
    { day: "Понеделник – Четвъртък", time: "12:00 – 22:30" },
    { day: "Петък – Събота", time: "12:00 – 23:30" },
    { day: "Неделя", time: "12:00 – 21:30" },
  ], // TODO: реално работно време

  reviews: {
    rating: 4.8,
    count: 25,
    source: "Google",
    testimonials: [
      {
        quote:
          "Страхотно попадение! Изключително вкусна храна и много приятни обстановка и обслужване!",
        author: "Димитър Я.",
        rating: 5,
      },
      {
        quote:
          "Обслужването беше на страхотно ниво - сервитьорите и собственикът бяха изключително мили, усмихнати и гостоприемни. Храната беше невероятно вкусна.",
        author: "Ейнджи К.",
        rating: 5,
      },
      {
        quote:
          "Много благодаря за топлото посрещане, за приятната атмосфера и вкусната храна! Заведението е много добре декорирано, обстановката е уютна и приятна.",
        author: "Росица Г.",
        rating: 5,
      },
      {
        quote:
          "Много любезно отношение, вкусна храна и приятна обстановка! Със сигурност ще посетя отново.",
        author: "Десислава Н.",
        rating: 5,
      },
      {
        quote:
          "Много добро място, храната страшно много ни хареса, а момичето, което ни обслужи беше излючително мило!",
        author: "Ванеса",
        rating: 5,
      },
      {
        quote:
          "Приятно място в близост до гребната. Менюто е с много богат избор, имат рибни и морски предложения, имат и месо.",
        author: "Мариета М.",
        rating: 4,
      },
    ],
  },

  // Реално меню на Lake House. Само текст (без снимки на ястия, изрично
  // искане) — description полето носи грамажа, не измислена дегустационна
  // бележка.
  menuCategories: [
    {
      name: "Супи",
      items: [
        {
          name: "Пилешка супа",
          description: "350г",
          price: "3.40€",
        },
        {
          name: "Шкембе чорба",
          description: "350г",
          price: "3.50€",
        },
        {
          name: "Таратор",
          description: "350г",
          price: "2.40€",
        },
      ],
    },
    {
      name: "Салати",
      items: [
        {
          name: "Шопска салата",
          description: "250г",
          price: "3.30€",
        },
        {
          name: "Гръцка салата",
          description: "250г",
          price: "3.50€",
        },
        {
          name: "Зеле с моркови",
          description: "200г",
          price: "2.80€",
        },
      ],
    },
    {
      name: "Основни ястия",
      items: [
        {
          name: "Леща яхния",
          description: "350г",
          price: "3.40€",
        },
        {
          name: "Шницел от кайма с гъби",
          description: "400г",
          price: "4.80€",
        },
        {
          name: "Свинско бавно печено в пюре",
          description: "400г",
          price: "5.10€",
        },
        {
          name: "Пилешки кюфтета с ориз",
          description: "400г",
          price: "5.10€",
        },
      ],
    },
    {
      name: "Скара",
      items: [
        {
          name: "Кюфтета с гарнитура",
          description: "280г",
          price: "4.60€",
        },
        {
          name: "Кебапчета с гарнитура",
          description: "280г",
          price: "4.60€",
        },
        {
          name: "Пилешка пържола",
          description: "250г",
          price: "5.40€",
        },
        {
          name: "Свински врат",
          description: "250г",
          price: "5.40€",
        },
      ],
    },
    {
      name: "Десерти",
      items: [
        {
          name: "Сладолед ваниля",
          description: "150г",
          price: "2.60€",
        },
        {
          name: "Диня/пъпеш",
          description: "300г",
          price: "2.30€",
        },
        {
          name: "Грис халва",
          description: "150г",
          price: "2.30€",
        },
      ],
    },
  ],

  menuPdfUrl: "#", // TODO: линк към пълно меню/PDF

  navigation: [
    { label: "Начало", href: "#home" },
    { label: "За нас", href: "#about" },
    { label: "Меню", href: "/menu" },
    { label: "Галерия", href: "#gallery" },
    { label: "Резервирай", href: "#reservation" },
    { label: "Контакти", href: "#contact" },
  ],
} as const;
