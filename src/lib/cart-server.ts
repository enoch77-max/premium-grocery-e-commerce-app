import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, carts } from "@/db/schema";
import { getCategories, getCoupons, getProducts } from "@/lib/store";
import { DELIVERY_FEE_CENTS, FREE_DELIVERY_THRESHOLD_CENTS, formatMoney } from "@/lib/format";
import { getStoreSettings } from "@/lib/admin";
import type { CartLine, CartState, CartUpsell, Coupon, Product } from "@/lib/types";

export const CART_COOKIE = "fresco_cart";
export const CART_HEADER = "x-cart-token";
const MAX_QTY = 20;

async function cookieToken() {
  try {
    const store = await cookies();
    return store.get(CART_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

async function writeCartCookie(token: string) {
  try {
    const store = await cookies();
    if (store.get(CART_COOKIE)?.value !== token) {
      store.set(CART_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
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

async function findCart(token: string) {
  const rows = await db.select().from(carts).where(eq(carts.token, token)).limit(1);
  return rows[0] ?? null;
}

async function ensureCart(token: string) {
  const existing = await findCart(token);
  if (existing) return existing;
  await db.insert(carts).values({ token }).onConflictDoNothing();
  const created = await findCart(token);
  if (!created) throw new Error("Unable to create cart");
  return created;
}

function emptyState(
  products: Product[],
  couponError: string | null = null,
  freeThreshold = FREE_DELIVERY_THRESHOLD_CENTS,
): CartState {
  return {
    lines: [],
    itemCount: 0,
    distinctCount: 0,
    subtotalCents: 0,
    savingsCents: 0,
    discountCents: 0,
    deliveryCents: 0,
    totalCents: 0,
    compareTotalCents: 0,
    coupon: null,
    couponError,
    freeDeliveryThresholdCents: freeThreshold,
    freeDeliveryRemainingCents: freeThreshold,
    upsells: products
      .filter((product) => product.compareAtCents && product.compareAtCents > product.priceCents)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 4)
      .map((product) => ({ product, reason: "Today's best-value add-on" })),
  };
}

function computeCoupon(
  coupon: Coupon | null,
  subtotalCents: number,
  deliveryFeeCents: number,
): { discountCents: number; deliveryOverride: number | null } {
  if (!coupon) return { discountCents: 0, deliveryOverride: null };
  if (coupon.kind === "percent" && coupon.percentOff) {
    return { discountCents: Math.floor((subtotalCents * coupon.percentOff) / 100), deliveryOverride: null };
  }
  if (coupon.kind === "fixed" && coupon.valueCents) {
    return { discountCents: Math.min(coupon.valueCents, subtotalCents), deliveryOverride: null };
  }
  if (coupon.kind === "delivery") {
    return { discountCents: 0, deliveryOverride: 0 };
  }
  return { discountCents: 0, deliveryOverride: deliveryFeeCents };
}

function buildUpsells(cartLines: CartLine[], products: Product[], categories: Map<string, string>): CartUpsell[] {
  const inCart = new Set(cartLines.map((line) => line.productId));
  const cartCategories = new Set(cartLines.map((line) => line.categorySlug));
  const candidates = products.filter((product) => !inCart.has(product.id));

  const scored = candidates.map((product) => {
    let score = product.popularity / 10;
    if (product.compareAtCents && product.compareAtCents > product.priceCents) score += 18;
    if (cartCategories.has(product.categorySlug)) score += 8;
    if (product.isBestseller) score += 4;
    return { product, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ product }) => {
      let reason = "Loved by your neighbours";
      if (product.compareAtCents && product.compareAtCents > product.priceCents) {
        reason = `Save ${formatMoney(product.compareAtCents - product.priceCents)} today`;
      } else if (cartCategories.has(product.categorySlug)) {
        reason = `Pairs with your ${categories.get(product.categorySlug) ?? "basket"}`;
      } else if (product.priceCents <= 300) {
        reason = "Easy add — under $3";
      }
      return { product, reason };
    });
}

async function cartScore(token: string) {
  const cart = await findCart(token).catch(() => null);
  if (!cart) return { token, cart: null, units: 0, updated: 0 };
  const rows = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id)).catch(() => []);
  return {
    token,
    cart,
    units: rows.reduce((sum, row) => sum + row.quantity, 0),
    updated: cart.updatedAt ? new Date(cart.updatedAt).getTime() : 0,
  };
}

/**
 * Resolves the basket for a browser holding one or more candidate tokens and
 * returns the token that should be used from now on. A non-empty cart always
 * wins over an empty one; ties break on most recently updated.
 */
export async function resolveCartForRequest(request?: Request, couponError: string | null = null) {
  const candidates = await getCartCandidates(request);
  if (!candidates.length) {
    return { cart: await resolveCart(null, couponError), token: null as string | null };
  }

  const scored = await Promise.all(candidates.map((token) => cartScore(token)));
  scored.sort((a, b) => b.units - a.units || b.updated - a.updated);
  const winner = scored[0];

  // Keep both storage locations pointing at the winning basket so they can
  // never drift apart again.
  if (winner.token) await writeCartCookie(winner.token);

  return {
    cart: await resolveCart(winner.token, couponError),
    token: winner.token,
  };
}

export async function resolveCart(token: string | null, couponError: string | null = null): Promise<CartState> {
  const products = await getProducts();

  const pricing = await getStoreSettings();
  const freeThreshold = pricing.freeDeliveryThresholdCents ?? FREE_DELIVERY_THRESHOLD_CENTS;
  if (!token) return emptyState(products, couponError, freeThreshold);

  try {
    const cart = await findCart(token);
    if (!cart) return emptyState(products, couponError, freeThreshold);

    const [categories, itemRows] = await Promise.all([
      getCategories(),
      db.select().from(cartItems).where(eq(cartItems.cartId, cart.id)),
    ]);

    const categoryNames = new Map(categories.map((category) => [category.slug, category.name]));
    const productMap = new Map(products.map((product) => [product.id, product]));

    const lines: CartLine[] = itemRows
      .map((row) => {
        const product = productMap.get(row.productId);
        if (!product) return null;
        const compare = product.compareAtCents && product.compareAtCents > product.priceCents ? product.compareAtCents : null;
        return {
          id: row.id,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          unit: product.unit,
          imageUrl: product.imageUrl,
          priceCents: product.priceCents,
          compareAtCents: compare,
          quantity: row.quantity,
          stock: product.stock,
          categorySlug: product.categorySlug,
          lineTotalCents: product.priceCents * row.quantity,
          lineSavingsCents: compare ? (compare - product.priceCents) * row.quantity : 0,
        } satisfies CartLine;
      })
      .filter((line): line is CartLine => Boolean(line));

    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const compareTotalCents = lines.reduce(
      (sum, line) => sum + (line.compareAtCents ?? line.priceCents) * line.quantity,
      0,
    );
    // Delivery pricing is owner-controlled (see /admin/settings).
    const deliveryFee = pricing.deliveryFeeCents ?? DELIVERY_FEE_CENTS;
    const baseDelivery = subtotalCents >= freeThreshold || subtotalCents === 0 ? 0 : deliveryFee;

    let coupon: Coupon | null = null;
    let effectiveCouponError = couponError;
    if (cart.couponCode) {
      const coupons = await getCoupons();
      const found = coupons.find((item) => item.code.toUpperCase() === cart.couponCode?.toUpperCase()) ?? null;
      if (!found) {
        effectiveCouponError = "That code is no longer available";
        await db.update(carts).set({ couponCode: null }).where(eq(carts.id, cart.id));
      } else if (subtotalCents >= found.minSubtotalCents) {
        if (found.kind === "delivery" && baseDelivery === 0) {
          // Delivery is already free — keep the saved code for a smaller shop
          // instead of pretending it saved money.
          effectiveCouponError = `${found.code} is saved to your basket — delivery is already free on this order.`;
        } else {
          coupon = found;
        }
      } else if (subtotalCents > 0) {
        effectiveCouponError = `Add ${formatMoney(
          found.minSubtotalCents - subtotalCents,
        )} more to unlock ${found.code} — it's saved to your basket.`;
      }
    }

    const { discountCents, deliveryOverride } = computeCoupon(coupon, subtotalCents, baseDelivery);
    const deliveryCents = deliveryOverride !== null ? deliveryOverride : baseDelivery;
    const discountLabel =
      coupon?.kind === "percent"
        ? `${coupon.percentOff}% off`
        : coupon?.kind === "delivery"
          ? "Free delivery"
          : coupon?.valueCents
            ? `${formatMoney(coupon.valueCents)} off`
            : "";

    return {
      lines,
      itemCount,
      distinctCount: lines.length,
      subtotalCents,
      savingsCents: compareTotalCents - subtotalCents,
      discountCents,
      deliveryCents,
      totalCents: Math.max(0, subtotalCents - discountCents + deliveryCents),
      compareTotalCents,
      coupon: coupon ? { code: coupon.code, description: coupon.description, discountCents, label: discountLabel } : null,
      couponError: effectiveCouponError,
      freeDeliveryThresholdCents: freeThreshold,
      freeDeliveryRemainingCents: Math.max(0, freeThreshold - subtotalCents),
      upsells: buildUpsells(lines, products, categoryNames),
    };
  } catch (error) {
    console.error("resolveCart failed", error);
    return emptyState(products, couponError, freeThreshold);
  }
}

export async function getCart(request?: Request) {
  return resolveCart(await readCartToken(request));
}

export async function addToCart(token: string, entries: Array<{ productId: number; quantity: number }>) {
  const products = await getProducts();
  const valid = entries.filter(
    (entry) => Number.isFinite(entry.productId) && products.some((product) => product.id === entry.productId),
  );
  if (!valid.length) return resolveCart(token);

  const cart = await ensureCart(token);
  for (const entry of valid) {
    const stock = products.find((product) => product.id === entry.productId)?.stock ?? MAX_QTY;
    const quantity = Math.max(1, Math.min(MAX_QTY, Math.round(entry.quantity || 1), Math.max(1, stock)));
    await db
      .insert(cartItems)
      .values({ cartId: cart.id, productId: entry.productId, quantity })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.productId],
        set: { quantity: sql`least(${cartItems.quantity} + ${quantity}, ${MAX_QTY})` },
      });
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  return resolveCart(token);
}

export async function updateCartQuantity(token: string, productId: number, quantity: number) {
  const cart = await findCart(token);
  if (!cart) return resolveCart(token);

  if (quantity <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)));
  } else {
    const products = await getProducts();
    const stock = products.find((product) => product.id === productId)?.stock ?? MAX_QTY;
    await db
      .update(cartItems)
      .set({ quantity: Math.max(1, Math.min(MAX_QTY, Math.round(quantity), Math.max(1, stock))) })
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId)));
  }
  return resolveCart(token);
}

export async function removeFromCart(token: string, productId: number) {
  return updateCartQuantity(token, productId, 0);
}

export async function clearCart(token: string) {
  const cart = await findCart(token);
  if (!cart) return;
  await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
  await db.update(carts).set({ couponCode: null }).where(eq(carts.id, cart.id));
}

export async function linkCartToUser(token: string, userId: number) {
  try {
    const cart = await findCart(token);
    if (!cart) return;
    await db.update(carts).set({ userId }).where(eq(carts.id, cart.id));
  } catch (error) {
    console.error("linkCartToUser failed", error);
  }
}

export async function setCartCoupon(token: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  const coupons = await getCoupons();
  const coupon = coupons.find((item) => item.code.toUpperCase() === code);
  if (!coupon) return resolveCart(token, "That code isn't valid — check the spelling and try again");

  // Save the code even before the minimum spend is met, so it applies
  // automatically the moment the basket qualifies.
  const cart = await ensureCart(token);
  await db.update(carts).set({ couponCode: coupon.code }).where(eq(carts.id, cart.id));
  return resolveCart(token);
}

export async function clearCartCoupon(token: string) {
  const cart = await findCart(token);
  if (!cart) return resolveCart(token);
  await db.update(carts).set({ couponCode: null }).where(eq(carts.id, cart.id));
  return resolveCart(token);
}
