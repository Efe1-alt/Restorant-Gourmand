import type { Metadata } from "next";
import { MfaSetup } from "@/components/admin/MfaSetup";
import { PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Сигурност" };

export default function SecurityPage() {
  return (
    <div>
      <PageTitle>Сигурност</PageTitle>
      <MfaSetup />
    </div>
  );
}
