import type { Metadata } from "next";
import { StandingStock, WeekPlanner } from "@/components/admin/WeekPlanner";
import { PageTitle } from "@/components/admin/ui";
import { getStandingToday, getWeek } from "@/lib/server/admin-data";
import { getSofiaNow } from "@/lib/server/clock";
import { addDays, isIsoDate, mondayOf, weekdayOf } from "@/lib/time";

export const metadata: Metadata = { title: "Седмица" };

export default async function WeekPage({ searchParams }: PageProps<"/admin/sedmica">) {
  const now = await getSofiaNow();
  const w = (await searchParams).w;
  const requested = typeof w === "string" && isIsoDate(w) ? mondayOf(w) : null;
  const monday = requested ?? (weekdayOf(now.date) === 0 ? addDays(now.date, 1) : mondayOf(now.date));
  const [week, standing] = await Promise.all([getWeek(monday), getStandingToday(now.date)]);
  return (
    <div>
      <PageTitle>Седмица</PageTitle>
      <WeekPlanner monday={monday} today={now.date} week={week} />
      <h2 className="mb-3 mt-10 font-serif-heading text-xl">Днес: постоянни ястия</h2>
      <StandingStock today={now.date} rows={standing} />
    </div>
  );
}
