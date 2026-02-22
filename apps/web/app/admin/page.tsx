import PinProtection from "@/components/admin/PinProtection";
import { redirect } from "next/navigation";

export default function AdminPage() {
  return (
    <PinProtection>
      <AdminRedirect />
    </PinProtection>
  );
}

function AdminRedirect() {
  redirect("/admin/manual-cut");
}
