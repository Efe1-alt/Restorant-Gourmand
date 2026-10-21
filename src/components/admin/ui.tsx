import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// Small admin UI kit on the site's tokens. Touch targets are 48px.

type Tone = "primary" | "secondary" | "danger" | "quiet" | "olive";
const tones: Record<Tone, string> = {
  primary: "bg-terracotta text-cream hover:bg-terracotta-dark",
  olive: "bg-olive text-cream hover:bg-olive-dark",
  secondary: "border border-line bg-paper text-ink hover:border-terracotta hover:text-terracotta",
  danger: "border border-terracotta-dark/40 bg-paper text-terracotta-dark hover:bg-terracotta-dark hover:text-cream",
  quiet: "text-ink-soft hover:text-terracotta",
};

export function buttonClass(tone: Tone = "secondary", size: "md" | "lg" | "sm" = "md") {
  const sizing = size === "lg" ? "min-h-14 px-6 text-base" : size === "sm" ? "min-h-10 px-3.5 text-sm" : "min-h-12 px-5 text-sm";
  return `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 ${sizing} ${tones[tone]}`;
}

export function Button({ tone = "secondary", size = "md", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: "md" | "lg" | "sm" }) {
  return <button type="button" {...props} className={`${buttonClass(tone, size)} ${className}`} />;
}

export const inputClass =
  "w-full rounded-xl border border-line bg-paper px-4 py-3 text-base outline-none transition-colors focus:border-terracotta disabled:opacity-60";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
      {children}
      {hint && <span className="ml-1 font-normal text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-paper p-4 sm:p-6 ${className}`}>{children}</section>;
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-serif-heading text-2xl font-medium sm:text-3xl">{children}</h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "ok" | "warn"; children: ReactNode }) {
  const cls = {
    info: "border-line bg-cream-soft text-ink",
    error: "border-terracotta-dark/40 bg-terracotta/10 text-terracotta-dark",
    ok: "border-olive/40 bg-olive/10 text-olive-dark",
    warn: "border-gold/60 bg-gold/15 text-ink",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  new: "bg-terracotta text-cream",
  accepted: "bg-gold/30 text-ink",
  preparing: "bg-gold/30 text-ink",
  out_for_delivery: "bg-olive/15 text-olive-dark",
  ready_for_pickup: "bg-olive/15 text-olive-dark",
  delivered: "bg-line text-ink-soft",
  picked_up: "bg-line text-ink-soft",
  awaiting_payment: "bg-cream-soft text-ink-soft border border-line",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status] ?? "bg-ink/10 text-ink"}`}>
      {label}
    </span>
  );
}
