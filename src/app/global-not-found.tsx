import type { Metadata } from "next";
import Link from "next/link";
import { manrope, playfair } from "./fonts";
import "./globals.css";

export const metadata: Metadata = { title: "404 — Gourmand", robots: { index: false } };

// One 404 for the Bulgarian site, the English site and the admin.
export default function GlobalNotFound() {
  return (
    <html lang="bg" className={`${playfair.variable} ${manrope.variable}`}>
      <body className="flex min-h-screen items-center justify-center bg-cream px-6 text-center text-ink">
        <div>
          <p className="font-serif-heading text-5xl text-terracotta">404</p>
          <h1 className="mt-4 text-2xl font-medium">Страницата не е намерена</h1>
          <p className="mt-1 text-ink-soft" lang="en">
            Page not found
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-6 text-sm font-semibold text-cream">
              Начало
            </Link>
            <Link href="/en" lang="en" className="inline-flex min-h-11 items-center rounded-full border border-line px-6 text-sm font-semibold">
              Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
