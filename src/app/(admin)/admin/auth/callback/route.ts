import { NextResponse } from "next/server";
import { authClient } from "@/lib/server/auth";

// Password-reset links land here: exchange the one-time code for a session.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  // Only same-site admin paths.
  const target = next && /^\/admin(\/[a-z0-9/-]*)?$/.test(next) ? next : "/admin";
  if (code) {
    const supabase = await authClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, url.origin));
  }
  return NextResponse.redirect(new URL("/admin/vhod", url.origin));
}
