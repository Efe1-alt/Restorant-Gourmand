"use client";

import { useActionState, useTransition } from "react";
import { moveCategoryAction, saveCategoryAction, toggleCategoryHiddenAction, type ActionResult } from "@/app/(admin)/admin/actions";
import type { Database } from "@/lib/database.types";
import { Button, Card, Input, Notice } from "./ui";

type Row = Database["public"]["Tables"]["categories"]["Row"];

function CategoryForm({ row }: { row?: Row }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveCategoryAction, { ok: true });
  return (
    <form action={action} className="flex flex-1 flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={row?.id ?? ""} />
      <Input name="name_bg" defaultValue={row?.name_bg} placeholder="Име (БГ)" aria-label="Име на български" className="!w-auto flex-1" required />
      <Input name="name_en" defaultValue={row?.name_en ?? ""} placeholder="Name (EN)" aria-label="Име на английски" lang="en" className="!w-auto flex-1" />
      <Button type="submit" size="sm" tone={row ? "secondary" : "primary"} disabled={pending}>
        {row ? "Запази" : "Добави"}
      </Button>
      {state.message && !state.ok && <span className="text-sm text-terracotta-dark">{state.message}</span>}
    </form>
  );
}

export function Categories({ rows }: { rows: Row[] }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <Card>
        <ul className="divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.id} className={`flex flex-wrap items-center gap-2 py-2 ${r.is_hidden ? "opacity-60" : ""}`}>
              <span className="flex gap-1">
                <Button size="sm" tone="quiet" aria-label="Нагоре" disabled={pending || i === 0} onClick={() => start(async () => void (await moveCategoryAction(r.id, -1)))}>
                  ↑
                </Button>
                <Button size="sm" tone="quiet" aria-label="Надолу" disabled={pending || i === rows.length - 1} onClick={() => start(async () => void (await moveCategoryAction(r.id, 1)))}>
                  ↓
                </Button>
              </span>
              <CategoryForm row={r} />
              <Button size="sm" disabled={pending} onClick={() => start(async () => void (await toggleCategoryHiddenAction(r.id, !r.is_hidden)))}>
                {r.is_hidden ? "Покажи" : "Скрий"}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Нова категория</h2>
        <CategoryForm />
      </Card>
      <Notice>Скритата категория скрива и ястията си от сайта. Минали поръчки не се променят.</Notice>
    </div>
  );
}
