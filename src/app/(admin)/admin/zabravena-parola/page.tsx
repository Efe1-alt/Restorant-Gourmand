import type { Metadata } from "next";
import { ResetRequestForm } from "@/components/admin/PasswordForms";

export const metadata: Metadata = { title: "Забравена парола" };

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-serif-heading text-center text-2xl">Нова парола</h1>
        <p className="mt-2 text-center text-sm text-ink-soft">Ще изпратим линк за смяна на паролата на имейла на собственика.</p>
        <div className="mt-8">
          <ResetRequestForm />
        </div>
      </div>
    </main>
  );
}
