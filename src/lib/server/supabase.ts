import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "./env";

export type Db = SupabaseClient<Database>;

let client: Db | null = null;

// The server's own client (secret key). Bypasses RLS: callers authorise first.
export function db(): Db {
  client ??= createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  return client;
}

export function photoUrl(path: string | null) {
  if (!path) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/dish-photos/${encodeURIComponent(path)}`;
}

// Postgres errors raised by our functions carry a code in `message` and JSON in `details`.
export function rpcError(error: { message: string; details?: string | null } | null) {
  if (!error) return null;
  let detail: Record<string, unknown> = {};
  try {
    detail = error.details ? JSON.parse(error.details) : {};
  } catch {}
  return { code: error.message, detail };
}
