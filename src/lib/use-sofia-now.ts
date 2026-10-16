"use client";

import { useMemo, useSyncExternalStore } from "react";
import { sofiaNow, type SofiaTime } from "./ordering";

// Текущата минута по софийско време като външен store: на сървъра (и при
// първия клиентски render) е null — без hydration разминаване; в браузъра се
// обновява, за да изчезват минали часове и да се смени денят в полунощ.
function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);

export function useSofiaNow(): SofiaTime | null {
  const minute = useSyncExternalStore(subscribe, currentMinute, () => null);
  return useMemo(() => (minute === null ? null : sofiaNow(new Date(minute * 60_000))), [minute]);
}
