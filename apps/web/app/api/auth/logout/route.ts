import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Client, Account } from "node-appwrite";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function POST() {
  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (sessionSecret) {
    try {
      const client = new Client()
        .setEndpoint(getRequiredEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
        .setProject(getRequiredEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
        .setSession(sessionSecret);

      const account = new Account(client);
      await account.deleteSession("current");
    } catch {
      // Clearing the local cookie is sufficient even if the upstream session is already gone.
    }
  }

  cookieStore.delete(ADMIN_SESSION_COOKIE);

  return NextResponse.json({ ok: true });
}
