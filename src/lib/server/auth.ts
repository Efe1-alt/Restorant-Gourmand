import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { env } from "./env";

// Supabase Auth client bound to the request cookies (owner session only).
export async function authClient() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session.
        }
      },
    },
  });
}

export type Owner = { id: string; email: string | null };

// The verified owner, or null. Authorisation comes from app_metadata.role
// (not user-editable) on a token whose signature getClaims() has checked.
// If the owner enrolled an authenticator app, the session must be aal2.
export async function getOwner(): Promise<Owner | null> {
  const supabase = await authClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const claims = data.claims as {
    sub: string;
    email?: string;
    aal?: string;
    app_metadata?: { role?: string };
  };
  if (claims.app_metadata?.role !== "owner") return null;
  if (claims.aal !== "aal2") {
    const { data: levels } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (levels?.nextLevel === "aal2") return null;
  }
  return { id: claims.sub, email: claims.email ?? null };
}

// For pages and server actions: redirects to the login page when needed.
export async function requireOwner(): Promise<Owner> {
  const owner = await getOwner();
  if (!owner) redirect("/admin/vhod");
  return owner;
}

export class UnauthorizedError extends Error {}

// For route handlers / actions that should fail rather than redirect.
export async function assertOwner(): Promise<Owner> {
  const owner = await getOwner();
  if (!owner) throw new UnauthorizedError("Not authorised");
  return owner;
}
