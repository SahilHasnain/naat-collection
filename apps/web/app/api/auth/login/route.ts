import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const endpoint = getRequiredEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
    const projectId = getRequiredEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
    const allowedUserId = getRequiredEnv("APPWRITE_ADMIN_USER_ID");
    const response = await fetch(`${endpoint}/account/sessions/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": projectId,
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data?.secret) {
      return NextResponse.json(
        { error: data?.message || "Invalid login credentials." },
        { status: response.status || 401 }
      );
    }

    const userResponse = await fetch(`${endpoint}/account`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Session": data.secret,
      },
      cache: "no-store",
    });

    const userData = await userResponse.json();

    if (!userResponse.ok || userData?.$id !== allowedUserId) {
      return NextResponse.json(
        { error: "This account is not authorized for admin access." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, data.secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create session.",
      },
      { status: 500 }
    );
  }
}
