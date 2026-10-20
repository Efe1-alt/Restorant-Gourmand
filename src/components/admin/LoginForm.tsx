"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/admin/browser-client";
import { Button, Input, Label, Notice } from "./ui";

// Email + password, then the authenticator code if the owner enrolled one.
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "mfa">("password");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function afterPassword() {
    const supabase = browserClient();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data && data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp.find((f) => f.status === "verified");
      if (totp) {
        setFactorId(totp.id);
        setStep("mfa");
        return;
      }
    }
    router.replace("/admin");
    router.refresh();
  }

  async function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const { error } = await browserClient().auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (error) {
      setError("Грешен имейл или парола.");
      return;
    }
    await afterPassword();
  }

  async function onCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    setBusy(true);
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const { error } = await browserClient().auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) {
      setError("Невалиден код. Опитайте с новия код от приложението.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  if (step === "mfa") {
    return (
      <form onSubmit={onCode} className="space-y-4">
        <div>
          <Label htmlFor="code">Код от приложението за удостоверяване</Label>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required autoFocus />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" tone="primary" size="lg" className="w-full" disabled={busy}>
          {busy ? "Проверка…" : "Потвърди"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onPassword} className="space-y-4">
      <div>
        <Label htmlFor="email">Имейл</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div>
        <Label htmlFor="password">Парола</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" tone="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? "Влизане…" : "Вход"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/admin/zabravena-parola" className="text-terracotta hover:text-terracotta-dark">
          Забравена парола
        </Link>
      </p>
    </form>
  );
}
