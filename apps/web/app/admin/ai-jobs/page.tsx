import AiJobsClient from "@/components/admin/AiJobsClient";

export const metadata = {
  title: "AI Jobs - Admin",
  description: "Inspect AI processing jobs for manual cut detection",
};

export default function AiJobsPage() {
  return <AiJobsClient />;
}
