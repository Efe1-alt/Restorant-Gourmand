"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser client for the owner's sign-in, MFA and password reset. Uses only
// the publishable key; data access goes through the server.
export function browserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
