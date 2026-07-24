import { createHmac, timingSafeEqual } from "crypto";
import { SITE_URL } from "@/lib/constants";
import type { Locale } from "@/lib/constants";
import { localePath } from "@/lib/locale-path";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days — cover the stay + buffer

function getSecret(): string {
  const secret =
    process.env.STAY_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STAY_TOKEN_SECRET (or service role key) is not configured");
  }
  return secret;
}

function base64UrlEncode(value: string | Buffer): string {
  const buf = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buf.toString("base64url");
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export type StayTokenPayload = {
  reservationId: string;
  exp: number;
};

export function createStayToken(
  reservationId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS
): string {
  const payload: StayTokenPayload = {
    reservationId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = createHmac("sha256", getSecret()).update(body).digest();
  return `${body}.${base64UrlEncode(sig)}`;
}

export function verifyStayToken(token: string): StayTokenPayload | null {
  try {
    const [body, sigPart] = token.split(".");
    if (!body || !sigPart) return null;

    const expected = createHmac("sha256", getSecret()).update(body).digest();
    const actual = base64UrlDecode(sigPart);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as StayTokenPayload;
    if (!payload.reservationId || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function stayManageUrl(reservationId: string, locale: Locale = "pt"): string {
  const token = createStayToken(reservationId);
  const path = localePath(locale, `/stay/${encodeURIComponent(token)}`);
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
