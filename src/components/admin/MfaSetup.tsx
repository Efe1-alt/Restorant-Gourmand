"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { browserClient } from "@/lib/admin/browser-client";
import { Button, Card, Input, Label, Notice } from "./ui";

type Factor = { id: string; friendly_name?: string; status: string };

// Optional second factor with an authenticator app (TOTP).
export function MfaSetup() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await browserClient().auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  }, []);
  useEffect(() => {
    let alive = true;
    browserClient()
      .auth.mfa.listFactors()
      .then(({ data }) => alive && setFactors((data?.totp ?? []) as Factor[]));
    return () => {
      alive = false;
    };
  }, []);

  async function start() {
    setMsg(null);
    const supabase = browserClient();
    // Drop unfinished enrolments first.
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of data?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data: e, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Gourmand ${new Date().toISOString().slice(0, 10)}` });
    if (error || !e) return setMsg({ ok: false, text: "Неуспешно: " + (error?.message ?? "") });
    setEnrolling({ id: e.id, qr: e.totp.qr_code, secret: e.totp.secret });
  }

  async function verify(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!enrolling) return;
    const code = String(new FormData(ev.currentTarget).get("code") ?? "").replace(/\s/g, "");
    const { error } = await browserClient().auth.mfa.challengeAndVerify({ factorId: enrolling.id, code });
    if (error) return setMsg({ ok: false, text: "Невалиден код." });
    setEnrolling(null);
    setMsg({ ok: true, text: "Включено. При следващия вход ще се иска код от приложението." });
    await load();
  }

  async function remove(id: string) {
    const { error } = await browserClient().auth.mfa.unenroll({ factorId: id });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Премахнато." });
    await load();
  }

  const verified = factors.filter((f) => f.status === "verified");
  return (
    <Card>
      <h2 className="text-lg font-semibold">Втори фактор (приложение за удостоверяване)</h2>
      <p className="mt-1 text-sm text-ink-soft">По избор. С Google Authenticator, 1Password, Authy и др. — освен паролата, при вход ще се иска и 6-цифрен код.</p>
      {msg && <div className="mt-3"><Notice tone={msg.ok ? "ok" : "error"}>{msg.text}</Notice></div>}
      {verified.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {verified.map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded-xl bg-cream-soft px-3 py-2">
              {f.friendly_name ?? "Приложение"}
              <Button size="sm" tone="danger" onClick={() => remove(f.id)}>
                Премахни
              </Button>
            </li>
          ))}
        </ul>
      ) : enrolling ? (
        <form onSubmit={verify} className="mt-4 space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL QR from Supabase */}
          <img src={enrolling.qr} alt="QR код за приложението" className="h-48 w-48 rounded-xl bg-white p-2" />
          <p className="break-all text-xs text-ink-soft">Или въведете ключа ръчно: {enrolling.secret}</p>
          <div className="max-w-xs">
            <Label htmlFor="code">Код от приложението</Label>
            <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
          </div>
          <Button type="submit" tone="primary">
            Потвърди
          </Button>
        </form>
      ) : (
        <Button className="mt-4" tone="primary" onClick={start}>
          Включи втори фактор
        </Button>
      )}
    </Card>
  );
}
