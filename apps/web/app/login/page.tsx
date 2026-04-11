import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getAdminSession } from "@/lib/admin-auth";

export default async function LoginPage() {
  const session = await getAdminSession();

  if (session && session.user.$id === process.env.APPWRITE_ADMIN_USER_ID) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-sky-950/30">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300/70">
            Appwrite Auth
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Admin Sign In
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Sign in with the single Appwrite admin account.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
