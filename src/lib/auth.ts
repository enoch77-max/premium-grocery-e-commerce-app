import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "fresco_session";
const SESSION_DAYS = 30;

export type AccountUser = {
  id: number;
  email: string;
  name: string;
  phone: string;
  marketingOptIn: boolean;
  orderUpdatesEmail: boolean;
  orderUpdatesSms: boolean;
  createdAt: string;
};

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/**
 * Session tokens are stored as SHA-256 digests. A stolen database dump therefore
 * cannot be replayed as a live session — the raw token only ever exists in the
 * shopper's httpOnly cookie.
 */
export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

async function readTokenFrom(request?: Request) {
  if (request) {
    const headerToken = request.headers.get("x-session-token");
    if (headerToken) return headerToken;
  }
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (cookieToken) return cookieToken;
  } catch {
    // cookies unavailable (e.g. static rendering) — fall through to headers
  }
  try {
    const headerStore = await headers();
    return headerStore.get("x-session-token");
  } catch {
    return null;
  }
}

export async function createSession(userId: number, userAgent = "") {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    token: hashSessionToken(token),
    userId,
    userAgent: userAgent.slice(0, 200),
    expiresAt,
  });
  try {
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
  } catch {
    // header token still works if cookie writing is unavailable
  }
  return token;
}

export async function destroySession(token: string | null) {
  if (token) await db.delete(sessions).where(eq(sessions.token, hashSessionToken(token)));
  try {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
  } catch {
    // ignore
  }
}

export async function getCurrentUser(request?: Request): Promise<AccountUser | null> {
  const token = await readTokenFrom(request);
  if (!token) return null;
  try {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        marketingOptIn: users.marketingOptIn,
        orderUpdatesEmail: users.orderUpdatesEmail,
        orderUpdatesSms: users.orderUpdatesSms,
        createdAt: users.createdAt,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      marketingOptIn: row.marketingOptIn,
      orderUpdatesEmail: row.orderUpdatesEmail,
      orderUpdatesSms: row.orderUpdatesSms,
      createdAt: row.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("getCurrentUser failed", error);
    return null;
  }
}

/**
 * When someone signs in we attach any guest orders placed with the same email
 * address, so order history is never lost by shopping before registering.
 */
export async function claimGuestOrders(userId: number, email: string) {
  try {
    await db
      .update(orders)
      .set({ userId })
      .where(and(isNull(orders.userId), sql`lower(${orders.email}) = ${normaliseEmail(email)}`));
  } catch (error) {
    console.error("claimGuestOrders failed", error);
  }
}

/** Simple in-memory throttle to keep auth endpoints honest. */
const attempts = new Map<string, { count: number; resetAt: number }>();

/** Stable per-client key: forwarded IP when present, else a UA hash. */
export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  const ua = request.headers.get("user-agent") ?? "";
  const seed = forwarded || real || ua || "anonymous";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return `${scope}:${Math.abs(hash).toString(36)}`;
}

export function rateLimit(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

/** Raw bearer token for the current request (cookie or header) — never logged. */
export async function getSessionToken(request?: Request): Promise<string | null> {
  return readTokenFrom(request);
}

/**
 * Invalidates every session for a user, optionally keeping the current device
 * signed in. Used after a password change so a compromised token cannot linger.
 */
export async function revokeUserSessions(userId: number, keepToken?: string | null) {
  if (keepToken) {
    await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.token, hashSessionToken(keepToken))));
    return;
  }
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
