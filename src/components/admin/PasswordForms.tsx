"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/admin/browser-client";
import { Button, Input, Label, Notice } from "./ui";

export function ResetRequestForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    await browserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/auth/callback?next=/admin/nova-parola`,
    });
    // Same message either way: don't reveal whether the address exists.
    setBusy(false);
    setSent(true);
  }
  if (sent) return <Notice tone="ok">Ако имейлът е на собственика, изпратихме линк за нова парола. Проверете пощата си.</Notice>;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Имейл</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <Button type="submit" tone="primary" size="lg" className="w-full" disabled={busy}>
        Изпрати линк
      </Button>
      <p className="text-center text-sm">
        <Link href="/admin/vhod" className="text-terracotta">
          Обратно към входа
        </Link>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < 12) return setError("Паролата трябва да е поне 12 знака.");
    if (password !== String(form.get("confirm") ?? "")) return setError("Паролите не съвпадат.");
    setBusy(true);
    const { error } = await browserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setError("Паролата не беше сменена. Отворете отново линка от имейла.");
    router.replace("/admin");
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="password">Нова парола</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
      </div>
      <div>
        <Label htmlFor="confirm">Повторете паролата</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" tone="primary" size="lg" className="w-full" disabled={busy}>
        Запази паролата
      </Button>
    </form>
  );
}
