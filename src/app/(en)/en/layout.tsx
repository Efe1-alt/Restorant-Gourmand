import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { indexable } from "@/lib/seo";
import "../../globals.css";

export const metadata: Metadata = {
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SiteShell locale="en">{children}</SiteShell>;
}
