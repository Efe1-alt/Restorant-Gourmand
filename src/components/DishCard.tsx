"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import type { MenuEntry, MenuItem } from "@/data/menu";
import { menuImage } from "@/data/menu/images";
import { AddToCartButton } from "./AddToCartButton";
import { DishDialog } from "./DishDialog";

// Карта на ястие („Меню“ и „От менюто“): снимка 4:3 с цената върху нея, име, съставки и
// долу грамаж + „+ Добави“. Клик върху снимката или името отваря прозореца с
// голямата снимка. entry липсва само за ястия без валидна цена.
export function DishCard({
  item,
  entry,
  className = "",
}: {
  item: MenuItem;
  entry?: MenuEntry;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const src = entry ? menuImage(entry) : null;
  const openDialog = entry ? () => setOpen(true) : undefined;

  const price = (
    <span
      className={`font-serif-heading absolute bottom-4 left-4 text-lg font-semibold sm:text-xl ${
        src ? "text-white" : "text-terracotta"
      }`}
    >
      {item.price}
    </span>
  );

  return (
    <article className={`group flex flex-col overflow-hidden rounded-xl bg-paper shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] ${className}`}>
      <button
        type="button"
        onClick={openDialog}
        disabled={!entry}
        aria-label={`Виж снимка: ${item.name}`}
        aria-haspopup="dialog"
        className="relative block aspect-[4/3] w-full overflow-hidden bg-cream-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terracotta disabled:cursor-default"
      >
        {src ? (
          <>
            <Image
              src={src}
              alt={item.name}
              fill
              sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-[400ms] group-hover:scale-[1.04]"
            />
            {/* Тъмен градиент отдолу, за да се чете цената върху всяка снимка. */}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/55 to-transparent" />
          </>
        ) : (
          <span aria-hidden className="flex h-full w-full items-center justify-center text-ink-soft/35">
            <UtensilsCrossed className="h-14 w-14" strokeWidth={1.25} />
          </span>
        )}
        {price}
      </button>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-[18px]">
        {/* line-clamp е на span-а — върху бутон (inline-block) не работи. */}
        <h3 title={item.name} className="text-lg font-medium leading-snug text-ink sm:text-xl">
          {entry ? (
            <button
              type="button"
              onClick={openDialog}
              aria-haspopup="dialog"
              className="block w-full text-left transition-colors duration-200 hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
            >
              <span className="line-clamp-2">{item.name}</span>
            </button>
          ) : (
            <span className="line-clamp-2">{item.name}</span>
          )}
        </h3>
        {item.description && (
          <p title={item.description} className="mt-1.5 line-clamp-2 text-sm italic leading-normal text-ink-soft">
            {item.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-[13px] text-ink-soft">{item.weight}</span>
          {entry && <AddToCartButton entry={entry} size="compact" />}
        </div>
      </div>

      {entry && <DishDialog entry={entry} open={open} onClose={close} />}
    </article>
  );
}
