import { AdminNav } from "@/components/admin/AdminNav";
import { requireOwner } from "@/lib/server/auth";

// Every panel page requires the owner (checked server-side on each request).
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwner();
  return (
    <div className="min-h-screen lg:flex">
      <AdminNav email={owner.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-12 lg:pt-8">{children}</main>
    </div>
  );
}
