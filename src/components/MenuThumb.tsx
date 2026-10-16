import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import type { MenuEntry } from "@/data/menu";
import { menuImage } from "@/data/menu/images";

// Квадратна миниатюра до ястието — еднаква в „От менюто“ и в страницата
// „Меню“. Снимките са на сив мрамор — saturate(0.95) леко ги приглушава
// спрямо кремавия фон. Без снимка → кремав квадрат с прибори.
export function MenuThumb({ entry }: { entry: MenuEntry }) {
  const src = menuImage(entry);
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-cream-soft sm:h-20 sm:w-20">
      {src ? (
        <Image src={src} alt={entry.item.name} fill sizes="80px" className="object-cover saturate-[.95]" />
      ) : (
        <div aria-hidden className="flex h-full w-full items-center justify-center text-ink-soft/50">
          <UtensilsCrossed className="h-6 w-6" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
