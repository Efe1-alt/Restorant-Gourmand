import type { Metadata } from "next";
import { LegalPage, legalMetadata } from "@/components/site/LegalPage";

export const metadata: Metadata = legalMetadata("terms", "bg");

export default function Page() {
  return <LegalPage kind="terms" locale="bg" />;
}
