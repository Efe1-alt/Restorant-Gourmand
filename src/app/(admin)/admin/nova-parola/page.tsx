import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/admin/PasswordForms";

export const metadata: Metadata = { title: "Смяна на паролата" };

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-serif-heading text-center text-2xl">Смяна на паролата</h1>
        <div className="mt-8">
          <NewPasswordForm />
        </div>
      </div>
    </main>
  );
}
