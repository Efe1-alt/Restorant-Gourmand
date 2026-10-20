import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DishForm } from "@/components/admin/DishForm";
import { PageTitle } from "@/components/admin/ui";
import { db, photoUrl } from "@/lib/server/supabase";

export const metadata: Metadata = { title: "Ястие" };

export default async function DishPage({ params }: PageProps<"/admin/menu/[id]">) {
  const raw = (await params).id;
  const { data: categories } = await db().from("categories").select("id, name_bg").order("sort_order");
  if (raw === "novo") {
    return (
      <div>
        <p className="mb-2 text-sm"><Link href="/admin/menu" className="text-terracotta">← Ястия</Link></p>
        <PageTitle>Ново ястие</PageTitle>
        <DishForm categories={categories ?? []} dish={null} />
      </div>
    );
  }
  const id = Number(raw);
  if (!Number.isInteger(id)) notFound();
  const { data: dish } = await db().from("dishes").select("*").eq("id", id).maybeSingle();
  if (!dish) notFound();
  return (
    <div>
      <p className="mb-2 text-sm"><Link href="/admin/menu" className="text-terracotta">← Ястия</Link></p>
      <PageTitle>{dish.name_bg}</PageTitle>
      <DishForm categories={categories ?? []} dish={{ ...dish, imageUrl: photoUrl(dish.image_path) }} />
    </div>
  );
}
