"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { useT } from "@/lib/locale-context";
import { siteConfig } from "@/lib/site-config";

// No request goes to Google until the visitor asks for the map, so the site
// sets no third-party cookies and needs no cookie banner.
export function ClickToLoadMap({ address }: { address: string }) {
  const t = useT().location;
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        title={t.mapTitle(siteConfig.name, address)}
        src={`https://www.google.com/maps?q=${encodeURIComponent(siteConfig.contact.mapsQuery)}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-full min-h-[320px] w-full rounded-2xl border border-line"
      />
    );
  }
  return (
    <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-cream px-6 text-center">
      <MapPin aria-hidden className="h-10 w-10 text-terracotta" strokeWidth={1.5} />
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-7 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
      >
        {t.loadMap}
      </button>
      <p className="max-w-xs text-xs text-ink-soft">{t.mapNotice}</p>
    </div>
  );
}
