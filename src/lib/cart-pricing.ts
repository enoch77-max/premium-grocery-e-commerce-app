import { DELIVERY_FEE_CENTS, FREE_DELIVERY_THRESHOLD_CENTS, formatMoney } from "@/lib/format";
import type { CartLine, CartState, CartUpsell, Coupon, Product } from "@/lib/types";
import { getStoreSettings } from "@/lib/admin";

export { DELIVERY_FEE_CENTS, FREE_DELIVERY_THRESHOLD_CENTS };

export function emptyState(
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

export function computeCoupon(
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

export function buildUpsells(
  cartLines: CartLine[],
  products: Product[],
  categories: Map<string, string>,
): CartUpsell[] {
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
