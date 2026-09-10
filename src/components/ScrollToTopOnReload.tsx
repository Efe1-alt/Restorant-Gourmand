"use client";

import { useEffect } from "react";

export function ScrollToTopOnReload() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    // Ако адресът има #hash (директен линк към секция, напр. /#reservation),
    // оставяме браузъра да скролне към нея — не я прескачаме към началото.
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  return null;
}
