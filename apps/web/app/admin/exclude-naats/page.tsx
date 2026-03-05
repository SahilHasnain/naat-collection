import ExcludeNaatsClient from "@/components/admin/ExcludeNaatsClient";
import PinProtection from "@/components/admin/PinProtection";

export default function ExcludeNaatsPage() {
  return (
    <PinProtection>
      <ExcludeNaatsClient />
    </PinProtection>
  );
}
