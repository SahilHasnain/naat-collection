import ManualCutClient from "@/components/admin/ManualCutClient";

export const metadata = {
  title: "Manual Audio Cut - Admin",
  description: "Manually cut explanation parts from naats",
};

export default function ManualCutPage() {
  return <ManualCutClient />;
}
