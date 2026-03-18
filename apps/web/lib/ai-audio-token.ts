import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

function getSecret() {
  return process.env.AI_INTERNAL_TOKEN_SECRET || process.env.APPWRITE_API_KEY || "";
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createAiAudioToken(audioId: string, ttlMs: number = DEFAULT_TTL_MS) {
  const expires = Date.now() + ttlMs;
  const payload = `${audioId}:${expires}`;
  return {
    expires,
    signature: sign(payload),
  };
}

export function verifyAiAudioToken(audioId: string, expires: string, signature: string) {
  const secret = getSecret();
  if (!secret) return false;

  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(`${audioId}:${expires}`);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
