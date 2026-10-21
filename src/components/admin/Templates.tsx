"use client";

import { useState, useTransition } from "react";
import { addTemplateDishAction, removeTemplateDishAction, setTemplatePortionsAction } from "@/app/(admin)/admin/actions";
import { Button, Card, Input, Notice, Select } from "./ui";

const DAYS = ["", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];
type Row = { weekday: number; dish_id: number; default_portions: number; sort_order: number };

export function Templates({ rows, dishes }: { rows: Row[]; dishes: { id: number; name_bg: string }[] }) {
  const [weekday, setWeekday] = useState(1);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [addId, setAddId] = useState("");
  const names = new Map(dishes.map((d) => [d.id, d.name_bg]));
  const list = rows.filter((r) => r.weekday === weekday);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? null : (r.message ?? "Грешка."));
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {DAYS.slice(1).map((d, i) => (
          <Button key={d} size="sm" tone={weekday === i + 1 ? "primary" : "secondary"} aria-pressed={weekday === i + 1} onClick={() => setWeekday(i + 1)}>
            {d} ({rows.filter((r) => r.weekday === i + 1).length})
          </Button>
        ))}
      </div>
      {msg && <Notice tone="error">{msg}</Notice>}
      <Card>
        <ul className="divide-y divide-line">
          {list.map((r) => (
            <li key={r.dish_id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-0 basis-full text-sm sm:basis-auto sm:flex-1">{names.get(r.dish_id) ?? `#${r.dish_id}`}</span>
              <label className="text-xs text-ink-soft" htmlFor={`p-${r.dish_id}`}>
                порции
              </label>
              <Input
                id={`p-${r.dish_id}`}
                inputMode="numeric"
                defaultValue={r.default_portions}
                className="!w-20 !px-2 !py-2 text-center"
                onBlur={(e) => Number(e.target.value) !== r.default_portions && run(() => setTemplatePortionsAction(weekday, r.dish_id, Number(e.target.value)))}
              />
              <Button size="sm" tone="quiet" aria-label="Махни" disabled={pending} onClick={() => run(() => removeTemplateDishAction(weekday, r.dish_id))}>
                ✕
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2 border-t border-line pt-3">
          <Select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Добави ястие в шаблона">
            <option value="">+ Добави ястие…</option>
            {dishes.filter((d) => !list.some((r) => r.dish_id === d.id)).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name_bg}
              </option>
            ))}
          </Select>
          <Button disabled={pending || !addId} onClick={() => run(async () => { const r = await addTemplateDishAction(weekday, Number(addId), 0); if (r.ok) setAddId(""); return r; })}>
            Добави
          </Button>
        </div>
      </Card>
    </div>
  );
}
