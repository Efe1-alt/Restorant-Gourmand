// Менюто на Gourmand. Отделно от site-config, за да се премести лесно в
// Supabase (таблица със същите полета: name, price, category).
// price е в евро като число — показва се през formatMenuPrice („4,30 €“).

export type MenuItem = {
  name: string;
  price: number;
  category: string;
};

// Редът на категориите (табовете) в менюто.
export const menuCategories = ["Основни", "Супи", "Салати", "Омлети", "Десерти"] as const;

export const menu: MenuItem[] = [
  { name: "Пържени кюфтета с картофена салата", price: 4.3, category: "Основни" },
  { name: "Свинска вратна пържола с моцарела и домати", price: 5.8, category: "Основни" },
  { name: "Пилешка пържола със задушени зеленчуци", price: 5.7, category: "Основни" },
  { name: "Пълнени чушки със сирене", price: 4.8, category: "Основни" },
  { name: "Кюфтета по чирпански", price: 4.9, category: "Основни" },
  { name: "Пилешки хапки със сусам", price: 4.3, category: "Основни" },
  { name: "Ципура на скара", price: 8.2, category: "Основни" },

  { name: "Боб чорба", price: 2.5, category: "Супи" },
  { name: "Шкембе чорба", price: 2.7, category: "Супи" },
  { name: "Пилешка супа", price: 2.4, category: "Супи" },

  { name: "Шопска салата", price: 4.5, category: "Салати" },
  { name: "Млечна салата", price: 2.4, category: "Салати" },
  { name: "Кьопоолу", price: 2.3, category: "Салати" },

  { name: "Бекон с яйца", price: 4.6, category: "Омлети" },

  { name: "Млечен крем", price: 2.0, category: "Десерти" },
  { name: "Макарони на фурна", price: 2.4, category: "Десерти" },
];

// 4.3 → „4,30 €“
export function formatMenuPrice(price: number) {
  return `${price.toFixed(2).replace(".", ",")} €`;
}

export function menuByCategory() {
  return menuCategories.map((name) => ({
    name,
    items: menu.filter((item) => item.category === name),
  }));
}
