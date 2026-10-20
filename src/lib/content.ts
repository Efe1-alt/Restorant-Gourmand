// Marketing copy per language. Bulgarian is the approved site copy; the
// English was drafted on 2026-10-20 and needs the owner's review.

import type { Locale } from "./routes";

export const content = {
  bg: {
    meta: {
      homeTitle: "Gourmand Пловдив – домашна храна, обедно меню и доставка",
      homeDescription:
        "Домашни ястия от истински продукти, приготвени всеки ден в Кючук Париж, Пловдив. Обедно меню, храна за вкъщи и доставка на храна в Пловдив.",
      menuTitle: "Меню и обедно меню в Пловдив — Gourmand",
      menuDescription: "Днешното обедно меню и цялото меню на Gourmand Пловдив: готвено, скара, риба, супи, салати и десерти. Поръчай онлайн за доставка или вземане.",
      orderTitle: "Поръчка — Gourmand Пловдив",
      orderDescription: "Поръчай домашна храна онлайн — доставка по квартали в Пловдив или вземане от място с отстъпка.",
    },
    heroEyebrow: "Домашна храна · За вкъщи · Пловдив",
    heroHeadlineLines: ["Сготвено като у дома"],
    heroLocation: "ул. „Гевгели“ 44 · до Събота пазар",
    heroDescription:
      "Домашни ястия от истински продукти, приготвени всеки ден – за вкъщи, за офиса или на място на ул. „Гевгели“.",
    heroOrder: "Поръчай онлайн",
    heroMenu: "Виж менюто",
    aboutEyebrow: "За нас",
    aboutTitle: "Истинска храна, без излишни думи",
    aboutText:
      "Gourmand е мястото в Кючук Париж, до Събота пазар, където обядът е като от домашната кухня, само че не трябва да го готвиш ти. Хапни на място, вземи за вкъщи или си поръчай с доставка.",
    aboutImageAlt: "Атмосферен кадър от залата",
    features: [
      { title: "Истински продукти", text: "Пюрето е от картофи, а не от пликче, и всяко ястие е сготвено от нулата." },
      { title: "Пристига топло", text: "Опаковаме така, че поръчката да стигне до теб такава, каквато е излязла от кухнята." },
    ],
    hoursFeatureTitle: (opens: string) => `От ${opens.replace(/^0/, "")} сутринта`,
    galleryTitle: "Галерия",
    galleryLead: "Кратък поглед към кухнята.",
    gallery: [
      { name: "Готвено", alt: "Готвено – обедно меню в Gourmand" },
      { name: "Супи", alt: "Супи в Gourmand" },
      { name: "Салати", alt: "Салати в Gourmand" },
      { name: "Скара", alt: "Скара в Gourmand" },
      { name: "Риба", alt: "Риба в Gourmand" },
      { name: "Десерти", alt: "Десерти в Gourmand" },
    ],
    reviewsTitle: "Какво казват клиентите ни",
    tagline: "Домашна храна за вкъщи и с доставка",
    address: "ул. „Гевгели“ 44, Пловдив (до Събота пазар)",
  },
  en: {
    meta: {
      homeTitle: "Gourmand Plovdiv – home cooking, lunch menu and food delivery",
      homeDescription:
        "Home-style dishes made from real ingredients every day in Kyuchuk Parizh, Plovdiv. Lunch menu, takeaway and food delivery in Plovdiv.",
      menuTitle: "Menu and lunch menu in Plovdiv — Gourmand",
      menuDescription: "Today's lunch menu and the full Gourmand Plovdiv menu: home cooking, grill, fish, soups, salads and desserts. Order online for delivery or pickup.",
      orderTitle: "Order — Gourmand Plovdiv",
      orderDescription: "Order home cooking online — delivery across Plovdiv districts, or pickup with a discount.",
    },
    heroEyebrow: "Home cooking · Takeaway · Plovdiv",
    heroHeadlineLines: ["Cooked like at home"],
    heroLocation: "44 Gevgeli St · next to the Saturday market",
    heroDescription:
      "Home-style dishes from real ingredients, cooked fresh every day – for home, for the office, or to eat in on Gevgeli Street.",
    heroOrder: "Order online",
    heroMenu: "See the menu",
    aboutEyebrow: "About us",
    aboutTitle: "Real food, no fuss",
    aboutText:
      "Gourmand is the place in Kyuchuk Parizh, next to the Saturday market, where lunch tastes like home cooking — only you don't have to cook it. Eat in, take away or have it delivered.",
    aboutImageAlt: "Our dining room",
    features: [
      { title: "Real ingredients", text: "The mash is made from potatoes, not a packet, and every dish is cooked from scratch." },
      { title: "Arrives hot", text: "We pack your order so it reaches you just as it left the kitchen." },
    ],
    hoursFeatureTitle: (opens: string) => `From ${opens.replace(/^0/, "")} in the morning`,
    galleryTitle: "Gallery",
    galleryLead: "A quick look at our kitchen.",
    gallery: [
      { name: "Home cooking", alt: "Home cooking – lunch menu at Gourmand" },
      { name: "Soups", alt: "Soups at Gourmand" },
      { name: "Salads", alt: "Salads at Gourmand" },
      { name: "Grill", alt: "Grill at Gourmand" },
      { name: "Fish", alt: "Fish at Gourmand" },
      { name: "Desserts", alt: "Desserts at Gourmand" },
    ],
    reviewsTitle: "What our customers say",
    tagline: "Home cooking to take away and delivered",
    address: "44 Gevgeli St, Plovdiv (next to the Saturday market)",
  },
} satisfies Record<Locale, unknown>;

export function getContent(locale: Locale) {
  return content[locale];
}
