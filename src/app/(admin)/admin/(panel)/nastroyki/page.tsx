import type { Metadata } from "next";
import { Settings } from "@/components/admin/Settings";
import { PageTitle } from "@/components/admin/ui";
import { getSofiaNow } from "@/lib/server/clock";
import { db } from "@/lib/server/supabase";
import { stripeConfigured } from "@/lib/server/stripe";

export const metadata: Metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const now = await getSofiaNow();
  const [settings, hours, closures, districts] = await Promise.all([
    db().from("settings").select("*").eq("id", 1).single(),
    db().from("business_hours").select("*"),
    db().from("closures").select("*").gte("closed_on", now.date).order("closed_on"),
    db().from("districts").select("*").order("sort_order").order("name_bg"),
  ]);
  return (
    <div>
      <PageTitle>Настройки</PageTitle>
      <Settings
        settings={settings.data!}
        hours={hours.data ?? []}
        closures={closures.data ?? []}
        districts={districts.data ?? []}
        stripeReady={stripeConfigured()}
        resendReady={Boolean(process.env.RESEND_API_KEY)}
      />
    </div>
  );
}
