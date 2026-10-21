import type { Metadata } from "next";
import { LegalPage, legalMetadata } from "@/components/site/LegalPage";

export const metadata: Metadata = legalMetadata("privacy", "en");

export default function Page() {
  return <LegalPage kind="privacy" locale="en" />;
}
