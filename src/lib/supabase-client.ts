import { createClient } from "@supabase/supabase-js";

// Browser client — ползва publishable/anon ключа (безопасен за клиентски код,
// защитен през RLS в самата база), не service role ключа. Формата за
// поръчка пише директно оттук, без сървърен proxy (сайтът е static export).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
