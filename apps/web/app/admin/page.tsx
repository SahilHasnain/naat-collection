import { redirect } from "next/navigation";

export default function AdminPage() {
  // Redirect to processed audio review
  redirect("/admin/processed-audio");
}
