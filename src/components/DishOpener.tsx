"use client";

import { useCallback, useState } from "react";
import { menuItemDetails, type MenuEntry } from "@/data/menu";
import { MenuThumb } from "./MenuThumb";
import { DishDialog } from "./DishDialog";

// Лявата част на реда в менюто (снимка + име + грамаж/описание). Целият блок
// отваря прозореца с ястието — бутонът е в заглавието, а after:inset-0 го
// разпъва върху снимката и текста, без да покрива цената и „+ Добави“.
export function DishOpener({ entry, stacked = false }: { entry: MenuEntry; stacked?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const details = menuItemDetails(entry.item);

  return (
    <div className={`group relative flex min-w-0 flex-1 items-center gap-3 sm:gap-4 ${
        // В „Меню“ на телефон заема целия ред — цената и „+ Добави“ слизат отдолу.
        stacked ? "basis-full sm:basis-auto" : ""
      }`}>
      <MenuThumb entry={entry} />
      <div className="min-w-0 flex-1">
        <h3 className="font-medium">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="text-left transition-colors duration-200 after:absolute after:inset-0 after:rounded-xl group-hover:text-terracotta focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-terracotta"
          >
            {entry.item.name}
          </button>
        </h3>
        {details && (
          <p className="mt-1 font-sans text-sm text-ink-soft">
            {details}
          </p>
        )}
      </div>
      <DishDialog entry={entry} open={open} onClose={close} />
    </div>
  );
}
