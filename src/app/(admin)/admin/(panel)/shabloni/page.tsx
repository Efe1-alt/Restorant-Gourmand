import type { Metadata } from "next";
import { Templates } from "@/components/admin/Templates";
import { PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/server/supabase";

export const metadata: Metadata = { title: "Шаблони" };

export default async function TemplatesPage() {
  const [tpl, dishes] = await Promise.all([
    db().from("weekday_templates").select("weekday, dish_id, default_portions, sort_order").order("sort_order"),
    db().from("dishes").select("id, name_bg").eq("is_standing", false).is("archived_at", null).order("name_bg"),
  ]);
  return (
    <div>
      <PageTitle>Шаблони по дни</PageTitle>
      <p className="mb-4 max-w-2xl text-sm text-ink-soft">
        От тези шаблони се попълва всяка нова седмица като чернова. Промените тук не засягат вече създадени дни.
      </p>
      <Templates rows={tpl.data ?? []} dishes={dishes.data ?? []} />
    </div>
  );
}
