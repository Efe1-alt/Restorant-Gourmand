import type { Metadata } from "next";
import { LegalPage, legalMetadata } from "@/components/site/LegalPage";

export const metadata: Metadata = legalMetadata("terms", "en");

export default function Page() {
  return <LegalPage kind="terms" locale="en" />;
}
