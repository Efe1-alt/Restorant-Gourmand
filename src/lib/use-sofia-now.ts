"use client";

import { useMemo, useSyncExternalStore } from "react";
import { sofiaNow, type SofiaNow } from "./time";

// The current minute in Europe/Sofia as an external store: null on the server
// and during the first client render (no hydration mismatch), then updated so
// past slots disappear and the day changes at midnight.
function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);

export function useSofiaNow(): SofiaNow | null {
  const minute = useSyncExternalStore(subscribe, currentMinute, () => null);
  return useMemo(() => (minute === null ? null : sofiaNow(new Date(minute * 60_000))), [minute]);
}
