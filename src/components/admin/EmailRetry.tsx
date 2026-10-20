"use client";

import { useState, useTransition } from "react";
import { retryEmailAction } from "@/app/(admin)/admin/actions";
import { Button } from "./ui";

export function EmailRetry({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      {msg && <span className="text-xs text-ink-soft">{msg}</span>}
      <Button size="sm" disabled={pending} onClick={() => start(async () => setMsg((await retryEmailAction(id)).message ?? null))}>
        Изпрати пак
      </Button>
    </span>
  );
}
