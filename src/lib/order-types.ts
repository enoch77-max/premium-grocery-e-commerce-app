/** Client-safe order types and status metadata (no database imports). */

export type OrderItemRecord = {
  id: number;
  orderId: number;
  productSlug: string;
  name: string;
  unit: string;
  imageUrl: string;
  priceCents: number;
  compareAtCents: number | null;
  quantity: number;
};

export type OrderRecord = {
  id: number;
  orderNumber: string;
  userId: number | null;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  deliverySlot: string;
  paymentMethod: string;
  notes: string;
  subtotalCents: number;
  savingsCents: number;
  deliveryCents: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  itemCount: number;
  status: string;
  cancelledAt: Date | string | null;
  createdAt: Date | string;
};

export type OrderWithItems = OrderRecord & { items: OrderItemRecord[] };

export const ORDER_STATUS_FLOW = ["confirmed", "packing", "on_the_way", "delivered"] as const;

export const ORDER_STATUS_LABELS: Record<string, { label: string; tone: string; note: string }> = {
  confirmed: { label: "Confirmed", tone: "brand", note: "Payment accepted and sent to our pickers" },
  packing: { label: "Packing", tone: "amber", note: "Our team is picking your items by hand" },
  on_the_way: { label: "On the way", tone: "amber", note: "Your driver has left the store" },
  delivered: { label: "Delivered", tone: "brand", note: "Left in a safe place as requested" },
  cancelled: { label: "Cancelled", tone: "clay", note: "Refunded to your original payment method" },
  // Legacy values written by the first version of the admin dashboard.
  packed: { label: "Packing", tone: "amber", note: "Our team is picking your items by hand" },
  "out-for-delivery": { label: "On the way", tone: "amber", note: "Your driver has left the store" },
};

/**
 * Normalises an order status to the customer-facing vocabulary. Older admin
 * builds wrote `packed` / `out-for-delivery`; those rows still exist, so we map
 * them rather than showing an "unknown status" badge or a broken tracker.
 */
export function normaliseOrderStatus(status: string) {
  if (status === "packed") return "packing";
  if (status === "out-for-delivery") return "on_the_way";
  return status;
}

/** True while the order is still being fulfilled. */
export function isActiveOrder(status: string) {
  const normalised = normaliseOrderStatus(status);
  return normalised !== "delivered" && normalised !== "cancelled";
}

export function orderStatusIndex(status: string) {
  const index = ORDER_STATUS_FLOW.indexOf(status as (typeof ORDER_STATUS_FLOW)[number]);
  return index === -1 ? 0 : index;
}
