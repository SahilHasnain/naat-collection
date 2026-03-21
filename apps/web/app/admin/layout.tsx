import PinProtection from "@/components/admin/PinProtection";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PinProtection>
      <div className="min-h-screen bg-neutral-950 text-white">
        <AdminHeader />
        {children}
      </div>
    </PinProtection>
  );
}
