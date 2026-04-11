import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "naat_admin_session";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    const payload = verifyAdminSessionToken(sessionToken);

    if (!payload) {
      return null;
    }

    return { user: { $id: payload.userId }, expiresAt: payload.expiresAt };
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

type AdminSessionPayload = {
  userId: string;
  expiresAt: number;
};

function signAdminSessionPayload(payloadBase64: string) {
  return createHmac("sha256", getRequiredEnv("ADMIN_SESSION_SECRET"))
    .update(payloadBase64)
    .digest("hex");
}

export function createAdminSessionToken(userId: string) {
  const payload: AdminSessionPayload = {
    userId,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const signature = signAdminSessionPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  const [payloadBase64, signature] = token.split(".");

  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = signAdminSessionPayload(payloadBase64);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = JSON.parse(
    Buffer.from(payloadBase64, "base64url").toString("utf8")
  ) as AdminSessionPayload;

  if (!payload.userId || payload.expiresAt <= Date.now()) {
    return null;
  }

  return payload;
}
