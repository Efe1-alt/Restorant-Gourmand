import type { Metadata, Viewport } from "next";
import { manrope, playfair } from "../../fonts";
import "../../globals.css";

export const metadata: Metadata = {
  title: { default: "Админ — Gourmand", template: "%s — Gourmand админ" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#faf5ec" };

// The owner admin: Bulgarian only, phone- and tablet-first.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={`${playfair.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full bg-cream text-ink">{children}</body>
    </html>
  );
}
