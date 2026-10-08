# Gourmand

Next.js 14 (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion.

## Старт

```bash
npm install
npm run dev
```

Отвори [http://localhost:3000](http://localhost:3000).

## Какво е placeholder и трябва да се замени

- Всички текстове, цени, ястия, ревюта, работно време и контакти са в
  [`src/lib/site-config.ts`](src/lib/site-config.ts) — редактирай само
  този файл за повечето промени по съдържанието.
- Снимките са стилизирани `PlaceholderImage` блокове
  ([`src/components/PlaceholderImage.tsx`](src/components/PlaceholderImage.tsx)).
  Замени ги с `next/image` / `<video>`, когато имаш реална фотография —
  всеки блок носи `TODO снимка: ...` етикет, показващ какво точно трябва
  да съдържа кадърът.
- Лого и брандинг цветове: цветовата палитра е дефинирана в
  [`src/app/globals.css`](src/app/globals.css) (CSS променливи в `:root`).

## Резервации (Supabase)

Резервационният widget пише директно от браузъра (client-side) в таблица
`reservations`, през `@supabase/supabase-js` с publishable/anon ключа —
виж [`src/lib/supabase-client.ts`](src/lib/supabase-client.ts) и
[`src/components/ReservationWidget.tsx`](src/components/ReservationWidget.tsx).
Няма сървърен API route — записът минава директно към Supabase, защитен
през RLS (row level security), не през proxy с service role ключ.

1. Създай Supabase проект (или ползвай вече провизионирания — виж `.env.local`).
2. Изпълни [`supabase/schema.sql`](supabase/schema.sql) в SQL editor-а
   (създава таблицата + INSERT policy за `anon` ролята).
3. Копирай `.env.local.example` в `.env.local` и попълни
   `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Settings → API → "Publishable key" в Supabase dashboard — НЕ Secret key).
4. Заявките се виждат в Supabase Studio → Table Editor → `reservations`.

Без тези env променливи формата показва грешка при submit вместо да
запише заявката.

## Дизайн система

- Heading font: Fraunces (serif с характер), body: Manrope — заредени
  през `next/font/google` в [`src/app/layout.tsx`](src/app/layout.tsx).
- Цветове: теракота + маслинено зелено + топъл крем фон — дефинирани като
  CSS custom properties, не hardcode-нати hex стойности в компонентите.
- Scroll-reveal анимации: [`src/components/ScrollReveal.tsx`](src/components/ScrollReveal.tsx)
  (Framer Motion, `whileInView`, `once: true`).

## Deploy

Стандартен Next.js деплой (напр. Vercel). Не забравяй да зададеш
`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` като env variables в
production настройките, не само локално.
