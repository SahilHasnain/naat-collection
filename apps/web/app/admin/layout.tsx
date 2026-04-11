import AdminHeader from "@/components/admin/AdminHeader";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminSession();

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AdminHeader />
      {children}
    </div>
  );
}
