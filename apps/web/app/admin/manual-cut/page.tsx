import ManualCutClient from "@/components/admin/ManualCutClient";
import PinProtection from "@/components/admin/PinProtection";

export const metadata = {
  title: "Manual Audio Cut - Admin",
  description: "Manually cut explanation parts from naats",
};

export default function ManualCutPage() {
  return (
    <PinProtection>
      <ManualCutClient />
    </PinProtection>
  );
}
