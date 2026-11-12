/**
 * Customer-facing voice for recurring orders.
 *
 * Rule: no status codes, no gateway names, no "error 402". Every customer-facing
 * string lives here so the tone stays warm and consistent, and so failure codes
 * can never leak into the UI by accident.
 */
import type { Cadence, RunState, ShortagePolicy } from "@/features/recurring/types";

export const CADENCE_COPY: Record<Cadence, { label: string; every: string; short: string }> = {
  daily: { label: "Every day", every: "arrives every day", short: "Daily" },
  weekly: { label: "Every week", every: "arrives once a week", short: "Weekly" },
  monthly: { label: "Every month", every: "arrives once a month", short: "Monthly" },
};

/** Plain-words shortage preference, exactly as the brief asks. */
export const SHORTAGE_COPY: Record<ShortagePolicy, { question: string; answer: string; detail: string }> = {
  partial: {
    question: "If something's missing, I'd like…",
    answer: "you to send the rest",
    detail: "We'll deliver what's available and only charge for that.",
  },
  skip_item: {
    question: "If something's missing, I'd like…",
    answer: "you to leave that item out",
    detail: "We'll skip just the missing item and send the rest.",
  },
  hold: {
    question: "If something's missing, I'd like…",
    answer: "you to hold the whole order",
    detail: "Nothing is sent and nothing is charged until everything's in.",
  },
};

export const RUN_STATE_COPY: Record<RunState, { label: string; note: string }> = {
  scheduled: { label: "Coming up", note: "Saved and ready to go." },
  reserved: { label: "Packing your box", note: "We're picking these right now." },
  charged: { label: "Payment taken", note: "Your card went through." },
  confirmed: { label: "On its way", note: "All items packed." },
  partially_fulfilled: { label: "On its way", note: "A couple of items were short." },
  held: { label: "Waiting on you", note: "We paused this one — nothing has been charged." },
  failed: { label: "Couldn't complete", note: "Nothing has been charged." },
  cancelled: { label: "Skipped", note: "You skipped this delivery." },
};

/** Map of gateway/backend failure codes → a kind, human sentence. */
export function friendlyFailure(code: string | null | undefined, itemName?: string) {
  const named = itemName ? `${itemName}` : "something";
  switch (code) {
    case "out_of_stock":
    case "hold_shortage":
      return `Oops, we're all out of ${named} right now. So sorry! Want us to send the rest?`;
    case "declined":
    case "card_declined":
      return "Oops, your card didn't go through. Nothing was charged. Want to try another card?";
    case "expired_card":
      return "Looks like that card has expired. Nothing was charged — pop in a new one and we'll carry on.";
    case "authentication_required":
      return "Your bank needs one quick confirmation. Nothing was charged — tap below when you're ready.";
    case "gateway_unavailable":
    case "no_payment_method":
      return "Our payment system isn't switched on yet, so nothing was charged. Your list is safe.";
    case "cancelled_by_customer":
      return "You skipped this delivery. Your list is still saved.";
    default:
      return "Something didn't quite work on our side, and nothing has been charged. Your list is saved — want to try again?";
  }
}

/** Turns any thrown value into a gentle line. Never shows technical text. */
export function friendlyError(fallback = "Something didn't quite work. Please try again.") {
  return fallback;
}

export const EMPTY_LISTS = {
  title: "No repeating orders yet",
  body: "Save your regulars once, and they'll turn up on their own — no remembering, no re-adding.",
};

export function scheduleSentence(cadence: Cadence, localTime: string, timezone?: string) {
  const zone = timezone && timezone !== "UTC" ? ` (${timezone.split("/").pop()?.replace(/_/g, " ")})` : "";
  return `${CADENCE_COPY[cadence].label} at ${localTime}${zone}`;
}

/** Friendly date: "Tomorrow", "Fri 14 Nov", "Sat 14 Nov 2027". */
export function friendlyDate(iso: string | Date | null | undefined) {
  if (!iso) return "Not scheduled";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "Not scheduled";

  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOf(date) - startOf(now)) / 86_400_000);

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";
  if (dayDiff === -1) return "Yesterday";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function friendlyTime(iso: string | Date | null | undefined) {
  if (!iso) return "";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
