import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Client, Account } from "node-appwrite";

export const ADMIN_SESSION_COOKIE = "naat_admin_session";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createSessionClient(sessionSecret: string) {
  const client = new Client()
    .setEndpoint(getRequiredEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
    .setProject(getRequiredEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
    .setSession(sessionSecret);

  return client;
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionSecret) {
    return null;
  }

  try {
    const account = new Account(createSessionClient(sessionSecret));
    const user = await account.get();
    return { user, sessionSecret };
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  const allowedUserId = getRequiredEnv("APPWRITE_ADMIN_USER_ID");

  if (!session || session.user.$id !== allowedUserId) {
    redirect("/login");
  }

  return session;
}
