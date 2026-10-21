import type { Metadata } from "next";
import Link from "next/link";
import { DishList } from "@/components/admin/DishList";
import { PageTitle, buttonClass } from "@/components/admin/ui";
import { getDishes } from "@/lib/server/admin-data";

export const metadata: Metadata = { title: "Ястия" };

export default async function DishesPage() {
  const { dishes, categories } = await getDishes();
  return (
    <div>
      <PageTitle actions={<Link href="/admin/menu/novo" className={buttonClass("primary")}>+ Ново ястие</Link>}>Ястия</PageTitle>
      <DishList
        categories={categories.map((c) => ({ id: c.id, name: c.name_bg }))}
        dishes={dishes.map((d) => ({
          id: d.id,
          name: d.name_bg,
          category: d.category_id,
          price: d.price_cents,
          image: d.imageUrl,
          standing: d.is_standing,
          visible: d.is_visible,
          archived: d.archived_at !== null,
          enStatus: d.en_status,
          allergensVerified: d.allergens_verified,
          notes: d.import_notes,
        }))}
      />
    </div>
  );
}
