"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { formatCents } from "@/lib/pricing";
import { Input, Select } from "./ui";

type Row = {
  id: number;
  name: string;
  category: number;
  price: number;
  image: string | null;
  standing: boolean;
  visible: boolean;
  archived: boolean;
  enStatus: string;
  allergensVerified: boolean;
  notes: string | null;
};

const FLAGS = {
  all: "Всички",
  needs_review: "Английски за преглед",
  allergens: "Без проверени алергени",
  no_photo: "Без снимка",
  hidden: "Скрити / архивирани",
  notes: "С бележки от импорта",
} as const;

export function DishList({ dishes, categories }: { dishes: Row[]; categories: { id: number; name: string }[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [flag, setFlag] = useState<keyof typeof FLAGS>("all");
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return dishes.filter((d) => {
      if (needle && !d.name.toLowerCase().includes(needle)) return false;
      if (cat && String(d.category) !== cat) return false;
      if (flag === "needs_review" && d.enStatus === "approved") return false;
      if (flag === "allergens" && d.allergensVerified) return false;
      if (flag === "no_photo" && d.image) return false;
      if (flag === "hidden" && d.visible && !d.archived) return false;
      if (flag === "notes" && !d.notes) return false;
      if (flag !== "hidden" && d.archived) return false;
      return true;
    });
  }, [dishes, q, cat, flag]);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="Търси ястие" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Търси ястие" />
        <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Категория">
          <option value="">Всички категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={flag} onChange={(e) => setFlag(e.target.value as keyof typeof FLAGS)} aria-label="Филтър">
          {Object.entries(FLAGS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>
      <p className="mt-3 text-sm text-ink-soft">{rows.length} ястия</p>
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
        {rows.map((d) => (
          <li key={d.id}>
            <Link href={`/admin/menu/${d.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-cream-soft">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-soft">
                {d.image ? <Image src={d.image} alt="" fill sizes="48px" className="object-cover" /> : <UtensilsCrossed aria-hidden className="m-3 h-6 w-6 text-ink-soft/40" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-medium ${d.archived || !d.visible ? "text-ink-soft line-through" : ""}`}>{d.name}</span>
                <span className="block text-xs text-ink-soft">
                  {catName.get(d.category)} · {d.standing ? "всеки ден" : "по дни"}
                  {d.enStatus !== "approved" && " · EN за преглед"}
                  {!d.allergensVerified && " · алергени непроверени"}
                </span>
              </span>
              <span className="shrink-0 font-semibold">{formatCents(d.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
