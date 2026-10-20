"use client";

import { useActionState, useTransition } from "react";
import Image from "next/image";
import { archiveDishAction, saveDishAction, type ActionResult } from "@/app/(admin)/admin/actions";
import { ALLERGENS } from "@/lib/allergens";
import type { Database } from "@/lib/database.types";
import { Button, Card, Input, Label, Notice, Select, Textarea } from "./ui";

type Dish = Database["public"]["Tables"]["dishes"]["Row"] & { imageUrl: string | null };

const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function DishForm({ dish, categories }: { dish: Dish | null; categories: { id: number; name_bg: string }[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveDishAction, { ok: true });
  const [archiving, startArchive] = useTransition();

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={dish?.id ?? ""} />
      {dish?.import_notes && <Notice tone="warn">Бележки от импорта: {dish.import_notes}</Notice>}
      {state.message && <Notice tone={state.ok ? "ok" : "error"}>{state.message}</Notice>}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name_bg">Име (български)</Label>
            <Input id="name_bg" name="name_bg" defaultValue={dish?.name_bg} required maxLength={200} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description_bg" hint="(съставки)">Описание</Label>
            <Textarea id="description_bg" name="description_bg" rows={2} defaultValue={dish?.description_bg} maxLength={600} />
          </div>
          <div>
            <Label htmlFor="price">Цена, €</Label>
            <Input id="price" name="price" inputMode="decimal" defaultValue={dish ? money(dish.price_cents) : ""} placeholder="4,90" required />
          </div>
          <div>
            <Label htmlFor="weight">Грамаж</Label>
            <Input id="weight" name="weight" defaultValue={dish?.weight} placeholder="350 г" maxLength={40} />
          </div>
          <div>
            <Label htmlFor="category_id">Категория</Label>
            <Select id="category_id" name="category_id" defaultValue={dish?.category_id ?? ""} required>
              <option value="" disabled>
                Изберете
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_bg}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="is_visible" defaultChecked={dish?.is_visible ?? true} className="h-5 w-5 accent-terracotta" /> Видимо в менюто
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Наличност</h2>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="is_standing" defaultChecked={dish?.is_standing ?? false} className="h-5 w-5 accent-terracotta" />
          Продава се всеки ден (постоянно ястие). Ако не е отметнато, ястието се добавя по дати в „Седмица“.
        </label>
        <div className="mt-3 max-w-xs">
          <Label htmlFor="standing_daily_cap" hint="(празно = без лимит)">Дневен лимит порции</Label>
          <Input id="standing_daily_cap" name="standing_daily_cap" inputMode="numeric" defaultValue={dish?.standing_daily_cap ?? ""} />
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Алергени</h2>
        <p className="mb-3 text-sm text-ink-soft">На сайта се показват само след като отметнете „Проверено от собственика“.</p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {Object.entries(ALLERGENS).map(([code, label]) => (
            <label key={code} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="allergens" value={code} defaultChecked={dish?.allergens.includes(code)} className="h-5 w-5 accent-terracotta" />
              {label.bg}
            </label>
          ))}
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="allergens_verified" defaultChecked={dish?.allergens_verified ?? false} className="h-5 w-5 accent-terracotta" />
          Проверено от собственика
        </label>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Английски</h2>
        <p className="mb-3 text-sm text-ink-soft">Чернова, преведена от българския. На /en се показва едва след „Одобрено“; дотогава там стои българският текст.</p>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="name_en">Name (English)</Label>
            <Input id="name_en" name="name_en" lang="en" defaultValue={dish?.name_en ?? ""} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="description_en">Description (English)</Label>
            <Textarea id="description_en" name="description_en" lang="en" rows={2} defaultValue={dish?.description_en ?? ""} maxLength={600} />
          </div>
          <div className="max-w-xs">
            <Label htmlFor="en_status">Статус на превода</Label>
            <Select id="en_status" name="en_status" defaultValue={dish?.en_status ?? "missing"}>
              <option value="missing">Липсва</option>
              <option value="needs_review">За преглед</option>
              <option value="approved">Одобрено — публикувай на английски</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Снимка</h2>
        <div className="flex flex-wrap items-center gap-4">
          {dish?.imageUrl && (
            <span className="relative h-24 w-32 overflow-hidden rounded-xl bg-cream-soft">
              <Image src={dish.imageUrl} alt="" fill sizes="128px" className="object-cover" />
            </span>
          )}
          <div>
            <Label htmlFor="photo" hint="(WebP, JPEG или PNG, до 5 MB)">Нова снимка</Label>
            <input id="photo" name="photo" type="file" accept="image/webp,image/jpeg,image/png" className="text-sm" />
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" tone="primary" size="lg" disabled={pending}>
          {pending ? "Запазване…" : "Запази"}
        </Button>
        {dish && (
          <Button
            tone={dish.archived_at ? "secondary" : "danger"}
            size="lg"
            disabled={archiving}
            onClick={() => startArchive(async () => void (await archiveDishAction(dish.id, !dish.archived_at)))}
          >
            {dish.archived_at ? "Възстанови" : "Премахни от менюто"}
          </Button>
        )}
      </div>
    </form>
  );
}
