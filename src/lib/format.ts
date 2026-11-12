export const FREE_DELIVERY_THRESHOLD_CENTS = 3500;
export const DELIVERY_FEE_CENTS = 399;
export const STANDARD_DELIVERY_FEE_CENTS = 399;

export function formatMoney(cents: number, withCents = true) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  }).format(cents / 100);
}

export function formatMoneyShort(cents: number) {
  return cents % 100 === 0 ? formatMoney(cents, false) : formatMoney(cents);
}

export function discountPercent(priceCents: number, compareAtCents: number | null) {
  if (!compareAtCents || compareAtCents <= priceCents) return 0;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}

export function savingsCents(priceCents: number, compareAtCents: number | null, quantity = 1) {
  if (!compareAtCents || compareAtCents <= priceCents) return 0;
  return (compareAtCents - priceCents) * quantity;
}

export function plural(count: number, singular: string, pluralForm?: string) {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

export function formatRating(rating: number) {
  return rating.toFixed(1);
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const deliverySlots = [
  { id: "express", label: "Express", detail: "25–40 min", feeNote: "Priority", icon: "bolt" },
  { id: "today-18", label: "Today", detail: "6–8pm", feeNote: "Free over $35", icon: "sun" },
  { id: "today-20", label: "Today", detail: "8–10pm", feeNote: "Free over $35", icon: "moon" },
  { id: "tomorrow-09", label: "Tomorrow", detail: "9–11am", feeNote: "Free over $35", icon: "sun" },
];

/** Human label for a stored delivery slot id ("today-18" → "Today · 6–8pm"). */
export function formatDeliverySlot(slotId: string) {
  const preset = deliverySlots.find((slot) => slot.id === slotId);
  if (preset) return `${preset.label} · ${preset.detail}`;
  if (slotId.startsWith("today-")) return `Today · ${slotId.replace("today-", "").replace("-", ":")}`;
  if (slotId.startsWith("tomorrow-"))
    return `Tomorrow · ${slotId.replace("tomorrow-", "").replace("-", ":")}`;
  return slotId;
}

export const paymentMethods = [
  { id: "card", label: "Card", detail: "Visa •••• 4242 saved", icon: "card" },
  { id: "apple", label: "Apple Pay", detail: "One-tap checkout", icon: "wallet" },
  { id: "cash", label: "Cash on delivery", detail: "Pay the driver", icon: "cash" },
];

export function orderNumber() {
  // ~57 bits of randomness: the confirmation link doubles as the guest
  // credential, so it must not be guessable.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `FR-${code}`;
}
