// Creates (or updates) the single owner account in the LOCAL Supabase stack.
// The role lives in app_metadata, which users cannot edit themselves.
// Credentials come from .env.development.local (DEV_OWNER_EMAIL / DEV_OWNER_PASSWORD).
//
// For production, create the owner once in the Supabase dashboard (Auth →
// Users → Add user) and set app_metadata {"role":"owner"} with the SQL editor:
//   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"owner"}' where email = '…';

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.development.local"), "utf8")
    .split("\n")
    .map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
  throw new Error(`Refusing to create a dev owner on a non-local Supabase (${url}).`);
}
const admin = createClient(url, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const email = env.DEV_OWNER_EMAIL;
const password = env.DEV_OWNER_PASSWORD;

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
if (listError) throw listError;
const found = list.users.find((u) => u.email === email);
if (found) {
  const { error } = await admin.auth.admin.updateUserById(found.id, { password, app_metadata: { role: "owner" } });
  if (error) throw error;
  console.log(`Updated local owner ${email}.`);
} else {
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "owner" } });
  if (error) throw error;
  console.log(`Created local owner ${email} (password in .env.development.local).`);
}
