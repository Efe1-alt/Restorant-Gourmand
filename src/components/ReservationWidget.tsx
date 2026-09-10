"use client";

import { useState, type FormEvent } from "react";
import { ScrollReveal } from "./ScrollReveal";
import { DateCalendar } from "./DateCalendar";
import { siteConfig } from "@/lib/site-config";
import { supabase } from "@/lib/supabase-client";

type Status = "idle" | "submitting" | "success" | "error";

const partySizes = Array.from({ length: 8 }, (_, i) => i + 1);
const timeSlots = [
  "12:00", "12:30", "13:00", "13:30", "14:00",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00",
];

const RESERVATION_WINDOW_MINUTES = 120;

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(timeA: string, timeB: string) {
  return Math.abs(toMinutes(timeA) - toMinutes(timeB)) < RESERVATION_WINDOW_MINUTES;
}

export function ReservationWidget() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [date, setDate] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);

    const form = new FormData(e.currentTarget);
    const clientName = String(form.get("name") ?? "").trim();
    const clientPhone = String(form.get("phone") ?? "").trim();
    const date = String(form.get("date") ?? "");
    const time = String(form.get("time") ?? "");
    const partySize = Number(form.get("partySize"));

    if (clientName.length < 2 || clientPhone.length < 6 || !date || !time || !partySize) {
      setStatus("error");
      setErrorMsg("Провери въведените данни.");
      return;
    }

    if (!supabase) {
      setStatus("error");
      setErrorMsg("Резервацията временно не е достъпна. Обади ни се директно.");
      return;
    }

    const { data: sameDayReservations, error: reservationsError } = await supabase
      .from("reservations")
      .select("time, table_id")
      .eq("date", date);

    if (reservationsError) {
      console.error(reservationsError);
      setStatus("error");
      setErrorMsg("Нещо се обърка. Опитай отново.");
      return;
    }

    const occupiedTableIds = new Set(
      (sameDayReservations ?? [])
        .filter((r) => r.table_id !== null && overlaps(r.time, time))
        .map((r) => r.table_id)
    );

    const { data: candidateTables, error: tablesError } = await supabase
      .from("tables")
      .select("id, capacity")
      .gte("capacity", partySize);

    if (tablesError) {
      console.error(tablesError);
      setStatus("error");
      setErrorMsg("Нещо се обърка. Опитай отново.");
      return;
    }

    const freeTables = (candidateTables ?? []).filter((t) => !occupiedTableIds.has(t.id));

    if (freeTables.length === 0) {
      setStatus("error");
      setErrorMsg("Няма свободна маса за този час, моля изберете друг час или ни се обадете на телефона в контактите.");
      return;
    }

    const bestTable = freeTables.reduce((best, t) =>
      t.capacity < best.capacity ? t : best
    );

    const { error } = await supabase.from("reservations").insert([
      {
        client_name: clientName,
        client_phone: clientPhone,
        date,
        time,
        party_size: partySize,
        status: "pending",
        table_id: bestTable.id,
      },
    ]);

    if (error) {
      console.error(error);
      setStatus("error");
      setErrorMsg("Нещо се обърка. Опитай отново.");
      return;
    }

    setStatus("success");
    (e.target as HTMLFormElement).reset();
    setDate("");
  }

  return (
    <section
      id="reservation"
      className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <ScrollReveal>
            <h2 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">
              Запазете маса
            </h2>
            <p className="mt-5 text-ink-soft leading-relaxed">
              Уикенд вечерите се резервират бързо — препоръчваме да пишете
              поне 3 дни предварително. За групи над 8 души, обадете се
              директно на{" "}
              <a href={`tel:${siteConfig.contact.phone}`} className="text-terracotta">
                {siteConfig.contact.phone}
              </a>
              .
            </p>
            <p className="mt-4 text-sm text-ink-soft/80 leading-relaxed">
              Ще потвърдим резервацията по телефон до 24 часа.
            </p>
          </ScrollReveal>
        </div>

        <div className="lg:col-span-7">
          <ScrollReveal delay={0.1}>
            {status === "success" ? (
              <div className="rounded-2xl border border-olive bg-olive/10 p-8 text-center">
                <p className="text-lg font-medium text-olive-dark">
                  Получихме заявката ви!
                </p>
                <p className="mt-2 text-ink-soft">
                  Ще се свържем с вас за потвърждение до 24 часа.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-6 text-sm font-semibold text-terracotta"
                >
                  Направи нова резервация
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-line bg-cream-soft p-6 sm:p-8"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium">
                      Име
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      minLength={2}
                      className="mt-1.5 w-full rounded-lg border border-line bg-cream px-4 py-3 text-base outline-none transition-colors focus:border-terracotta"
                      placeholder="Твоето име"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="phone" className="block text-sm font-medium">
                      Телефон
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      className="mt-1.5 w-full rounded-lg border border-line bg-cream px-4 py-3 text-base outline-none transition-colors focus:border-terracotta"
                      placeholder="08XX XXX XXX"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <span className="block text-sm font-medium">Дата</span>
                    <div className="mt-1.5">
                      <DateCalendar name="date" value={date} onChange={setDate} required />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="time" className="block text-sm font-medium">
                      Час
                    </label>
                    <select
                      id="time"
                      name="time"
                      required
                      disabled={!date}
                      defaultValue=""
                      className="mt-1.5 w-full rounded-lg border border-line bg-cream px-4 py-3 text-base outline-none transition-colors focus:border-terracotta disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled>
                        {date ? "Избери час" : "Първо избери дата"}
                      </option>
                      {timeSlots.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="partySize" className="block text-sm font-medium">
                      Брой гости
                    </label>
                    <select
                      id="partySize"
                      name="partySize"
                      required
                      defaultValue={2}
                      className="mt-1.5 w-full rounded-lg border border-line bg-cream px-4 py-3 text-base outline-none transition-colors focus:border-terracotta"
                    >
                      {partySizes.map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "гост" : "гости"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {status === "error" && (
                  <p role="alert" className="mt-4 text-sm font-medium text-terracotta-dark">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="mt-6 w-full rounded-full bg-terracotta py-3.5 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark disabled:opacity-60 sm:w-auto sm:px-8"
                >
                  {status === "submitting" ? "Изпращане..." : "Запази маса"}
                </button>
              </form>
            )}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
