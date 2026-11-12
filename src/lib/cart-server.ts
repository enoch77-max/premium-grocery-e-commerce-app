import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, carts } from "@/db/schema";
import { getCategories, getCoupons, getProducts } from "@/lib/store";
import { DELIVERY_FEE_CENTS, FREE_DELIVERY_THRESHOLD_CENTS, formatMoney } from "@/lib/format";
import { getStoreSettings } from "@/lib/admin";
import { buildUpsells, computeCoupon, emptyState } from "@/lib/cart-pricing";
import type { CartLine, CartState, CartUpsell, Coupon, Product } from "@/lib/types";

import {
  CART_COOKIE,
  CART_HEADER,
  MAX_QTY,
  ensureCart,
  findCart,
  getCartCandidates,
  getOrCreateCartToken,
  readCartToken,
  writeCartCookie,
} from "@/lib/cart-identity";

// Re-exported so existing route imports keep working.
export { CART_COOKIE, CART_HEADER, getCartCandidates, getOrCreateCartToken, readCartToken };
async function cartScore(token: string) {
  const cart = await findCart(token).catch(() => null);
  if (!cart) return { token, cart: null, units: 0, updated: 0 };
  const rows = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, cart.id))
    .catch(() => []);
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

export async function resolveCart(
  token: string | null,
  couponError: string | null = null,
): Promise<CartState> {
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
        const compare =
          product.compareAtCents && product.compareAtCents > product.priceCents
            ? product.compareAtCents
            : null;
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
      const found =
        coupons.find((item) => item.code.toUpperCase() === cart.couponCode?.toUpperCase()) ?? null;
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
      coupon: coupon
        ? { code: coupon.code, description: coupon.description, discountCents, label: discountLabel }
        : null,
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
