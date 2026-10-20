import type { Metadata } from "next";
import { Categories } from "@/components/admin/Categories";
import { PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/server/supabase";

export const metadata: Metadata = { title: "Категории" };

export default async function CategoriesPage() {
  const { data } = await db().from("categories").select("*").order("sort_order").order("id");
  return (
    <div>
      <PageTitle>Категории</PageTitle>
      <Categories rows={data ?? []} />
    </div>
  );
}
