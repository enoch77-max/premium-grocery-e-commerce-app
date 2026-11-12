import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { carts } from "@/db/schema";

export const CART_COOKIE = "fresco_cart";
export const CART_HEADER = "x-cart-token";
export const MAX_QTY = 20;

export async function cookieToken() {
  try {
    const store = await cookies();
    return store.get(CART_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function writeCartCookie(token: string) {
  try {
    const store = await cookies();
    if (store.get(CART_COOKIE)?.value !== token) {
      const embedded = process.env.NODE_ENV === "production";
      store.set(CART_COOKIE, token, {
        httpOnly: true,
        sameSite: embedded ? "none" : "lax",
        partitioned: embedded,
        secure: embedded,
        path: "/",
        maxAge: 60 * 60 * 24 * 60,
      });
    }
  } catch {
    // cookie writing is best-effort; the header/localStorage path still works
  }
}

/**
 * Every token that could identify this shopper's basket. The browser can hold
 * up to two (the localStorage header and the httpOnly cookie) and they can drift
 * apart when storage is blocked, cleared or partitioned. Rather than trusting
 * one and risking an empty basket, we resolve all of them and pick the cart that
 * actually has items.
 */
export async function getCartCandidates(request?: Request): Promise<string[]> {
  const candidates: string[] = [];
  const header = request?.headers.get(CART_HEADER)?.trim();
  if (header) candidates.push(header);
  const cookie = await cookieToken();
  if (cookie) candidates.push(cookie);
  return [...new Set(candidates)];
}

/** Backwards-compatible single-token read (header first, then cookie). */
export async function readCartToken(request?: Request) {
  const candidates = await getCartCandidates(request);
  return candidates[0] ?? null;
}

export async function getOrCreateCartToken(request?: Request) {
  const candidates = await getCartCandidates(request);
  const token = candidates[0] ?? crypto.randomUUID();
  await writeCartCookie(token);
  return token;
}

export async function findCart(token: string) {
  const rows = await db.select().from(carts).where(eq(carts.token, token)).limit(1);
  return rows[0] ?? null;
}

export async function ensureCart(token: string) {
  const existing = await findCart(token);
  if (existing) return existing;
  await db.insert(carts).values({ token }).onConflictDoNothing();
  const created = await findCart(token);
  if (!created) throw new Error("Unable to create cart");
  return created;
}
