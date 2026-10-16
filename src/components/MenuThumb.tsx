import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import type { MenuEntry } from "@/data/menu";
import { menuImage } from "@/data/menu/images";

const sizes = {
  // „От менюто“ на началната страница
  md: { box: "h-16 w-16 sm:h-20 sm:w-20", px: "80px", icon: "h-6 w-6" },
  // страницата „Меню“
  lg: { box: "h-28 w-28 sm:h-36 sm:w-36", px: "144px", icon: "h-8 w-8" },
};

// Квадратна миниатюра до ястието. Без снимка → неутрален placeholder.
export function MenuThumb({ entry, size = "md" }: { entry: MenuEntry; size?: keyof typeof sizes }) {
  const src = menuImage(entry);
  const s = sizes[size];
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl bg-cream-soft ${s.box}`}>
      {src ? (
        <Image src={src} alt={entry.item.name} fill sizes={s.px} className="object-cover" />
      ) : (
        <div aria-hidden className="flex h-full w-full items-center justify-center text-ink-soft/30">
          <UtensilsCrossed className={s.icon} strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
