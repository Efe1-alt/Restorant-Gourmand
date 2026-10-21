"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addClosureAction,
  confirmHoursAction,
  removeClosureAction,
  saveDistrictAction,
  saveHoursAction,
  saveSettingsAction,
  type ActionResult,
} from "@/app/(admin)/admin/actions";
import type { Database } from "@/lib/database.types";
import { Button, Card, Input, Label, Notice, Textarea } from "./ui";

type T = Database["public"]["Tables"];
const money = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));
const DAYS = [1, 2, 3, 4, 5, 6, 0];
const NAMES = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-5 w-5 accent-terracotta" /> {label}
    </label>
  );
}

function Result({ state }: { state: ActionResult }) {
  return state.message ? <Notice tone={state.ok ? "ok" : "error"}>{state.message}</Notice> : null;
}

export function Settings({
  settings,
  hours,
  closures,
  districts,
  stripeReady,
  resendReady,
}: {
  settings: T["settings"]["Row"];
  hours: T["business_hours"]["Row"][];
  closures: T["closures"]["Row"][];
  districts: T["districts"]["Row"][];
  stripeReady: boolean;
  resendReady: boolean;
}) {
  const [settingsState, settingsAction, savingSettings] = useActionState<ActionResult, FormData>(saveSettingsAction, { ok: true });
  const [hoursState, hoursAction, savingHours] = useActionState<ActionResult, FormData>(saveHoursAction, { ok: true });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [closureDate, setClosureDate] = useState("");
  const [closureNote, setClosureNote] = useState("");
  const run = (fn: () => Promise<ActionResult>) => start(async () => setMsg(await fn()));
  const confirmed = settings.hours_confirmed_at !== null;
  const h = (kind: string, wd: number) => hours.find((x) => x.kind === kind && x.weekday === wd);

  return (
    <div className="space-y-6">
      <Card className={confirmed ? "" : "border-gold"}>
        <h2 className="text-lg font-semibold">Онлайн поръчки</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {confirmed
            ? "Часовете са потвърдени — онлайн поръчките са включени в часовете за поръчки."
            : "Онлайн поръчките са ИЗКЛЮЧЕНИ, докато не потвърдите работното време и часовете за поръчки по-долу."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button tone={confirmed ? "secondary" : "primary"} size="lg" disabled={pending} onClick={() => run(() => confirmHoursAction(!confirmed))}>
            {confirmed ? "Изключи онлайн поръчките" : "Потвърждавам часовете — включи поръчките"}
          </Button>
        </div>
        {msg?.message && <div className="mt-3"><Notice tone={msg.ok ? "ok" : "error"}>{msg.message}</Notice></div>}
        <ul className="mt-4 space-y-1 text-sm">
          <li>Плащане с карта (Stripe): {stripeReady ? "свързано (тестов режим локално)" : "няма ключ — картите не се предлагат"}</li>
          <li>Имейли (Resend): {resendReady ? "свързани" : "няма ключ — имейлите остават като неизпратени в „Имейли“"}</li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Правила за поръчка</h2>
        <p className="mb-4 text-sm text-ink-soft">Стойностите са взети от Kliento и очакват вашето потвърждение.</p>
        <form action={settingsAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="min_subtotal" hint="(за доставка)">Минимална сума за храна, €</Label>
            <Input id="min_subtotal" name="min_subtotal" inputMode="decimal" defaultValue={money(settings.min_subtotal_cents)} />
          </div>
          <div>
            <Label htmlFor="free_delivery_from" hint="(празно = никога)">Безплатна доставка от, €</Label>
            <Input id="free_delivery_from" name="free_delivery_from" inputMode="decimal" defaultValue={money(settings.free_delivery_from_cents)} />
          </div>
          <div>
            <Label htmlFor="pickup_discount" hint="(0 = без отстъпка)">Отстъпка при вземане, %</Label>
            <Input id="pickup_discount" name="pickup_discount" inputMode="decimal" defaultValue={String(settings.pickup_discount_bps / 100).replace(".", ",")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="delivery_estimate">Доставка, мин</Label>
              <Input id="delivery_estimate" name="delivery_estimate" inputMode="numeric" defaultValue={settings.delivery_estimate_minutes} />
            </div>
            <div>
              <Label htmlFor="pickup_estimate">Вземане, мин</Label>
              <Input id="pickup_estimate" name="pickup_estimate" inputMode="numeric" defaultValue={settings.pickup_estimate_minutes} />
            </div>
          </div>
          <div>
            <Label htmlFor="owner_notification_email">Имейл за нови поръчки</Label>
            <Input id="owner_notification_email" name="owner_notification_email" type="email" defaultValue={settings.owner_notification_email ?? ""} />
          </div>
          <div>
            <Label htmlFor="reply_to_email" hint="(отговор от клиент)">Reply-To</Label>
            <Input id="reply_to_email" name="reply_to_email" type="email" defaultValue={settings.reply_to_email ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Check name="card_payments_enabled" label="Приемай плащане с карта онлайн" defaultChecked={settings.card_payments_enabled} />
            <Check name="turnstile_enabled" label="Cloudflare Turnstile (проверка за ботове)" defaultChecked={settings.turnstile_enabled} />
            <Check name="ordering_paused" label="Пауза — временно спри онлайн поръчките" defaultChecked={settings.ordering_paused} />
          </div>
          <div>
            <Label htmlFor="pause_message_bg">Съобщение при пауза (БГ)</Label>
            <Textarea id="pause_message_bg" name="pause_message_bg" rows={2} defaultValue={settings.pause_message_bg ?? ""} maxLength={300} />
          </div>
          <div>
            <Label htmlFor="pause_message_en">Pause message (EN)</Label>
            <Textarea id="pause_message_en" name="pause_message_en" rows={2} lang="en" defaultValue={settings.pause_message_en ?? ""} maxLength={300} />
          </div>
          <div className="space-y-3 sm:col-span-2">
            <Result state={settingsState} />
            <Button type="submit" tone="primary" disabled={savingSettings}>
              Запази правилата
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Часове</h2>
        <p className="mb-4 text-sm text-ink-soft">Работно време (показва се на сайта) и часове за онлайн поръчки. След промяна трябва да потвърдите отново.</p>
        <form action={hoursAction}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-ink-soft">
                  <th className="py-2 font-medium">Ден</th>
                  <th className="py-2 font-medium">Работно време</th>
                  <th className="py-2 font-medium">Онлайн поръчки</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((wd) => (
                  <tr key={wd} className="border-t border-line">
                    <th scope="row" className="py-2 pr-2 text-left font-medium">{NAMES[wd]}</th>
                    {(["opening", "ordering"] as const).map((kind) => {
                      const row = h(kind, wd);
                      return (
                        <td key={kind} className="py-2 pr-3">
                          <span className="flex items-center gap-2">
                            <input type="checkbox" aria-label={`${NAMES[wd]} отворено`} name={`${kind}-${wd}-open`} defaultChecked={Boolean(row)} className="h-5 w-5 accent-terracotta" />
                            <Input type="time" aria-label="От" name={`${kind}-${wd}-opens`} defaultValue={row?.opens.slice(0, 5) ?? "10:00"} className="!w-28 !px-2 !py-2" />
                            <span>–</span>
                            <Input type="time" aria-label="До" name={`${kind}-${wd}-closes`} defaultValue={row?.closes.slice(0, 5) ?? "18:00"} className="!w-28 !px-2 !py-2" />
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-3">
            <Result state={hoursState} />
            <Button type="submit" tone="primary" disabled={savingHours}>
              Запази часовете
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Почивни дни</h2>
        <ul className="mb-3 divide-y divide-line text-sm">
          {closures.map((c) => (
            <li key={c.closed_on} className="flex items-center justify-between py-2">
              <span>
                {c.closed_on} {c.note && <span className="text-ink-soft">— {c.note}</span>}
              </span>
              <Button size="sm" tone="quiet" disabled={pending} onClick={() => run(() => removeClosureAction(c.closed_on))}>
                Премахни
              </Button>
            </li>
          ))}
          {closures.length === 0 && <li className="py-2 text-ink-soft">Няма предстоящи.</li>}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input type="date" aria-label="Дата" value={closureDate} onChange={(e) => setClosureDate(e.target.value)} className="!w-auto" />
          <Input aria-label="Бележка" placeholder="Бележка (по избор)" value={closureNote} onChange={(e) => setClosureNote(e.target.value)} className="!w-auto flex-1" />
          <Button disabled={pending || !closureDate} onClick={() => run(async () => { const r = await addClosureAction(closureDate, closureNote); setClosureDate(""); setClosureNote(""); return r; })}>
            Добави
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Квартали за доставка</h2>
        <p className="mb-3 text-sm text-ink-soft">Цени от Kliento — потвърдете ги.</p>
        <ul className="divide-y divide-line">
          {districts.map((d) => (
            <DistrictRow key={d.id} row={d} />
          ))}
        </ul>
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-2 text-sm font-semibold">Нов квартал</p>
          <DistrictRow />
        </div>
      </Card>
    </div>
  );
}

function DistrictRow({ row }: { row?: T["districts"]["Row"] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(saveDistrictAction, { ok: true });
  return (
    <li className="list-none py-2">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={row?.id ?? ""} />
        <Input name="name_bg" defaultValue={row?.name_bg} placeholder="Име" aria-label="Име на квартала" className="!w-auto min-w-40 flex-1" required />
        <Input name="name_en" defaultValue={row?.name_en ?? ""} placeholder="EN" aria-label="Име на английски" className="!w-auto min-w-32 flex-1" lang="en" />
        <Input name="fee" inputMode="decimal" defaultValue={row ? money(row.fee_cents) : ""} placeholder="1,00" aria-label="Цена на доставката, €" className="!w-24 text-center" required />
        <label className="flex min-h-11 items-center gap-1.5 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={row?.is_active ?? true} className="h-5 w-5 accent-terracotta" /> активен
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {row ? "Запази" : "Добави"}
        </Button>
        {state.message && <span className={`text-xs ${state.ok ? "text-olive" : "text-terracotta-dark"}`}>{state.message}</span>}
      </form>
    </li>
  );
}
