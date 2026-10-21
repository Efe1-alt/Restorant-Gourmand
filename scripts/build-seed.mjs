// Generates supabase/seed.sql and docs/menu-import-report.md from:
//   - src/data/menu/*.json           (the repo menu)
//   - src/data/menu/images.ts        (which photo belongs to which dish)
//   - supabase/seed-data/*.json      (English drafts, Kliento districts and
//                                     the Kliento menu snapshot)
//
// Run: npm run seed:build   (then `npx supabase db reset` applies it)
//
// Nothing is invented: prices, weights and descriptions come from the repo;
// allergens stay empty; template portions are 0 until the owner sets them;
// conflicts with the live Kliento menu are reported, not "fixed".

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));

// ---------------------------------------------------------------------------
// Sources

const LUNCH_DAYS = [
  ["monday", 1],
  ["tuesday", 2],
  ["wednesday", 3],
  ["thursday", 4],
  ["friday", 5],
  ["saturday", 6],
];

const CATEGORIES = [
  { slug: "lunch", bg: "Обедно меню", en: "Lunch menu" },
  { slug: "grill", bg: "Скара", en: "Grill" },
  { slug: "fish", bg: "Риба", en: "Fish" },
  { slug: "soups", bg: "Супи", en: "Soups" },
  { slug: "salads", bg: "Салати", en: "Salads" },
  { slug: "omelets", bg: "Омлети", en: "Omelettes" },
  { slug: "desserts", bg: "Десерти", en: "Desserts" },
  { slug: "drinks", bg: "Напитки", en: "Drinks" },
  { slug: "bread", bg: "Хляб", en: "Bread" },
];

const DISTRICTS_EN = {
  "Беломорски": "Belomorski",
  "Въстанически": "Vastanicheski",
  "Гагарин": "Gagarin",
  "Гребна база": "Grebna Baza (Rowing Canal)",
  "Западен": "Zapaden (West)",
  "Източен": "Iztochen (East)",
  "Каменица 1": "Kamenitsa 1",
  "Каменица 2": "Kamenitsa 2",
  "Капана": "Kapana",
  "Коматево": "Komatevo",
  "Кършияка": "Karshiyaka",
  "Кючук Париж": "Kyuchuk Parizh",
  "Мараша": "Marasha",
  "Остромила": "Ostromila",
  "Съдийски": "Sadiyski",
  "Тракия": "Trakia",
  "Христо Ботев - Север": "Hristo Botev – North",
  "Христо Ботев - Юг": "Hristo Botev – South",
  "Христо Смирненски": "Hristo Smirnenski",
  "Център": "Tsentar (Centre)",
  "Южен": "Yuzhen (South)",
};

const translations = json("supabase/seed-data/translations-en.json");
const klientoDistricts = json("supabase/seed-data/kliento-districts-2026-10-20.json").districts;
const klientoMenu = json("supabase/seed-data/kliento-menu-2026-10-20.json").items;

// images.ts: `"Име": "file.webp",` lines, plus excludedIds.
const imagesTs = read("src/data/menu/images.ts");
const images = new Map([...imagesTs.matchAll(/^\s*"([^"]+)":\s*\n?\s*"([^"]+\.webp)"/gm)].map((m) => [m[1], m[2]]));
const excludedIds = new Set(JSON.parse(/excludedIds = new Set\((\[[^\]]*\])\)/.exec(imagesTs)[1]));

// ---------------------------------------------------------------------------
// Helpers

function priceCents(price) {
  const m = /^(\d+)(?:,(\d{1,2}))?\s*€$/.exec(price.trim());
  if (!m) throw new Error(`Bad price: ${price}`);
  return Number(m[1]) * 100 + (m[2] ? Number(m[2].padEnd(2, "0")) : 0);
}

const TRANSLIT = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
};
function slugify(text) {
  return text
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 110);
}

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[-–„“"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// ---------------------------------------------------------------------------
// Dishes

const dishes = []; // { slug, category, name, weight, price, description, standing, image, notes[] , key }
const bySlug = new Set();
const lunchByName = new Map();
const templates = []; // { weekday, key, sort }

function uniqueSlug(base) {
  let slug = base;
  for (let n = 2; bySlug.has(slug); n++) slug = `${base}-${n}`;
  bySlug.add(slug);
  return slug;
}

function addDish({ category, item, standing, key, imageAllowed = true }) {
  const t = translations[key];
  const dish = {
    key,
    slug: uniqueSlug(slugify(item.name)),
    category,
    name: item.name,
    weight: item.weight,
    price: priceCents(item.price),
    description: item.description,
    standing,
    image: imageAllowed ? images.get(item.name) ?? null : null,
    nameEn: t?.[0] ?? null,
    descriptionEn: t ? t[1] : null,
    notes: [],
    variants: [],
  };
  if (!t) dish.notes.push("Няма английски превод.");
  if (!item.weight) dish.notes.push("Липсва грамаж.");
  if (!item.description) dish.notes.push("Липсва описание.");
  if (!dish.image) dish.notes.push("Няма снимка.");
  dishes.push(dish);
  return dish;
}

for (const [day, weekday] of LUNCH_DAYS) {
  const items = json(`src/data/menu/lunch-${day}.json`);
  items.forEach((item, sort) => {
    const id = `lunch-${day.slice(0, 3)}:${item.name}`;
    let dish;
    if (excludedIds.has(id)) {
      // Same name, different dish (see images.ts): its own row, no photo.
      dish = addDish({ category: "lunch", item, standing: false, key: `${item.name}#2`, imageAllowed: false });
      dish.notes.push(`Различно ястие със същото име като друго обедно ястие (${day}).`);
    } else if (lunchByName.has(item.name)) {
      dish = lunchByName.get(item.name);
      const variant = `${item.weight} · ${item.price} · ${item.description}`;
      const canonical = `${dish.weight} · ${(dish.price / 100).toFixed(2).replace(".", ",")} € · ${dish.description}`;
      if (variant !== canonical && !dish.variants.includes(variant)) dish.variants.push(`${day}: ${variant}`);
      if (priceCents(item.price) !== dish.price) dish.notes.push(`Различна цена в ${day}: ${item.price}.`);
    } else {
      dish = addDish({ category: "lunch", item, standing: false, key: item.name });
      lunchByName.set(item.name, dish);
    }
    templates.push({ weekday, slug: dish.slug, sort });
  });
}

for (const cat of CATEGORIES.slice(1)) {
  json(`src/data/menu/${cat.slug}.json`).forEach((item) => {
    addDish({ category: cat.slug, item, standing: true, key: item.name });
  });
}
for (const d of dishes) {
  if (d.variants.length) d.notes.push(`Варианти в други дни (запазен е първият): ${d.variants.join(" | ")}`);
}

// ---------------------------------------------------------------------------
// Kliento cross-check (Tuesday snapshot + standing categories)

const report = { priceDiffs: [], textDiffs: [], missingInRepo: [], matched: 0 };
const repoByNorm = new Map();
for (const d of dishes) {
  if (!repoByNorm.has(norm(d.name))) repoByNorm.set(norm(d.name), []);
  repoByNorm.get(norm(d.name)).push(d);
}
const KLIENTO_ALIASES = {
  "свински шницел от свинска кайма с картофена салата": "свински шницел от кайма с картофена салата",
  "таратор супа": "таратор",
  "салата кьопоолу": "кьопоолу",
  "салата домати и краставици": "домати и краставици",
  "салата зеле и моркови": "зеле и моркови",
  "салата мариновани червени чушки": "мариновани червени чушки",
  "пържени кюфтета с гарнитура от картофена салата": "пържени кюфтета с картофена салата",
  "кока кола": "кока кола",
  "кока кола без захар": "кока кола без захар",
};
for (const k of klientoMenu) {
  let key = norm(k.name);
  key = KLIENTO_ALIASES[key] ?? key;
  const candidates = repoByNorm.get(key) ?? repoByNorm.get(key.replace(/ /g, " "));
  const lunchFirst = (candidates ?? []).sort((a, b) =>
    (k.category === "Меню Вторник") === (a.category === "lunch") ? -1 : 1
  );
  const d = lunchFirst[0];
  if (!d) {
    report.missingInRepo.push(`${k.category}: „${k.name}“ — ${k.price}`);
    continue;
  }
  report.matched++;
  const kp = priceCents(k.price);
  if (kp !== d.price) {
    const line = `„${d.name}“: репо ${(d.price / 100).toFixed(2)} € / Kliento ${k.price}`;
    report.priceDiffs.push(line);
    d.notes.push(`Kliento (20.10.2026) показва ${k.price}.`);
  }
  const kd = k.description.replace(/,?\s*\d+\s*(гр|мл)\.?$/i, "").replace(/\.$/, "").trim();
  if (d.description && kd && norm(kd) !== norm(d.description) && !/^\d/.test(kd)) {
    report.textDiffs.push(`„${d.name}“: репо „${d.description}“ / Kliento „${kd}“`);
  }
}

// ---------------------------------------------------------------------------
// SQL

const lines = [];
const out = (s) => lines.push(s);

out("-- GENERATED by scripts/build-seed.mjs — do not edit by hand.");
out("-- Business values below are seeded from Kliento / the repo and are UNCONFIRMED");
out("-- until the owner signs them off (docs/backend-scope.md).");
out("");
out("begin;");
out("");
out("-- Categories");
CATEGORIES.forEach((c, i) => {
  out(`insert into public.categories (slug, name_bg, name_en, sort_order) values (${q(c.slug)}, ${q(c.bg)}, ${q(c.en)}, ${i * 10});`);
});
out("");
out("-- Dishes (allergens empty and unverified; English drafted, needs review)");
dishes.forEach((d, i) => {
  out(
    `insert into public.dishes (slug, category_id, name_bg, name_en, description_bg, description_en, en_status, price_cents, weight, image_path, is_standing, sort_order, import_notes) values (` +
      [
        q(d.slug),
        `(select id from public.categories where slug = ${q(d.category)})`,
        q(d.name),
        q(d.nameEn),
        q(d.description),
        d.nameEn ? q(d.descriptionEn ?? "") : "null",
        q(d.nameEn ? "needs_review" : "missing"),
        d.price,
        q(d.weight),
        q(d.image),
        d.standing ? "true" : "false",
        i,
        q(d.notes.length ? d.notes.join(" ") : null),
      ].join(", ") +
      ");"
  );
});
out("");
out("-- Weekday templates (Mon–Sat) from lunch-*.json. Portions 0 until the owner sets them.");
templates.forEach((t) => {
  out(
    `insert into public.weekday_templates (weekday, dish_id, default_portions, sort_order) values (${t.weekday}, (select id from public.dishes where slug = ${q(t.slug)}), 0, ${t.sort}) on conflict do nothing;`
  );
});
out("");
out("-- Delivery districts and fees from Kliento (2026-10-20)");
klientoDistricts.forEach((d, i) => {
  out(
    `insert into public.districts (name_bg, name_en, fee_cents, sort_order) values (${q(d.name_bg)}, ${q(DISTRICTS_EN[d.name_bg] ?? null)}, ${Math.round(Number(d.fee) * 100)}, ${i * 10});`
  );
});
out("");
out("-- Settings: Kliento minimum €5, free delivery from €25, pickup −10%.");
out("-- Estimates are placeholders. hours_confirmed_at stays null: checkout is off.");
out(
  "insert into public.settings (id, min_subtotal_cents, free_delivery_from_cents, pickup_discount_bps, delivery_estimate_minutes, pickup_estimate_minutes) values (1, 500, 2500, 1000, 60, 30);"
);
out("");
out("-- Opening hours (display): Mon–Fri 08:00–19:00, Sat 08:00–14:30.");
out("-- Ordering hours (checkout) from Kliento: Mon–Fri 10:00–18:15, Sat 10:00–14:00.");
for (let wd = 1; wd <= 5; wd++) {
  out(`insert into public.business_hours (kind, weekday, opens, closes) values ('opening', ${wd}, '08:00', '19:00');`);
  out(`insert into public.business_hours (kind, weekday, opens, closes) values ('ordering', ${wd}, '10:00', '18:15');`);
}
out("insert into public.business_hours (kind, weekday, opens, closes) values ('opening', 6, '08:00', '14:30');");
out("insert into public.business_hours (kind, weekday, opens, closes) values ('ordering', 6, '10:00', '14:00');");
out("");
out("commit;");
writeFileSync(join(root, "supabase/seed.sql"), lines.join("\n") + "\n");

// ---------------------------------------------------------------------------
// Report

const flagged = dishes.filter((d) => d.notes.length);
const md = [];
md.push("# Menu import report");
md.push("");
md.push("Generated by `scripts/build-seed.mjs`. Source: `src/data/menu/*.json`, photos in");
md.push("`public/images/menu/` (uploaded to the `dish-photos` Storage bucket), and the live");
md.push("Kliento storefront at gourmand.bg as shown on Tuesday 20 October 2026.");
md.push("Nothing here was changed automatically: the owner decides.");
md.push("");
md.push("## Totals");
md.push("");
md.push(`- Dishes imported: **${dishes.length}** (${dishes.filter((d) => !d.standing).length} lunch, ${dishes.filter((d) => d.standing).length} standing)`);
md.push(`- Weekday template entries: **${templates.length}** (portions 0 — the owner sets them)`);
md.push(`- With a photo: **${dishes.filter((d) => d.image).length}**, without: **${dishes.filter((d) => !d.image).length}**`);
md.push(`- Allergens: **empty for every dish**, unverified`);
md.push(`- English text: drafted for **${dishes.filter((d) => d.nameEn).length}**, all "needs review"`);
md.push(`- Delivery districts: **${klientoDistricts.length}**, fees from Kliento`);
md.push("");
md.push("## Kliento cross-check (Tuesday menu + standing categories)");
md.push("");
md.push(`Kliento items matched to the repo: ${report.matched} of ${klientoMenu.length}.`);
md.push("");
md.push("### Price differences");
md.push("");
md.push(report.priceDiffs.length ? report.priceDiffs.map((l) => `- ${l}`).join("\n") : "None.");
md.push("");
md.push("### On Kliento but not in the repo");
md.push("");
md.push(report.missingInRepo.length ? report.missingInRepo.map((l) => `- ${l}`).join("\n") : "None.");
md.push("");
md.push("### Description differences");
md.push("");
md.push(report.textDiffs.length ? report.textDiffs.map((l) => `- ${l}`).join("\n") : "None.");
md.push("");
md.push("## Dishes flagged for the owner");
md.push("");
md.push("| Dish | Category | Notes |");
md.push("|---|---|---|");
for (const d of flagged) md.push(`| ${d.name} | ${d.category} | ${d.notes.join(" ").replace(/\|/g, "/")} |`);
md.push("");
writeFileSync(join(root, "docs/menu-import-report.md"), md.join("\n"));

console.log(
  `seed.sql: ${dishes.length} dishes, ${templates.length} template rows, ${klientoDistricts.length} districts. ` +
    `Kliento: ${report.matched} matched, ${report.priceDiffs.length} price diffs, ${report.missingInRepo.length} missing.`
);
