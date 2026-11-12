/**
 * Customer message templates.
 *
 * One registry, keyed by event then locale. The site currently ships English
 * only (`<html lang="en">`), so the `en` set is complete; adding a language is
 * adding a sibling locale object — no component changes needed.
 *
 * House rules enforced here and in tests:
 *  • every rendered message is under 300 characters (WhatsApp template limit),
 *  • casual, warm, humble voice,
 *  • exactly one action link,
 *  • no technical codes ever reach the customer.
 */

export type MessageParams = {
  name: string;
  link: string;
  item?: string;
  list?: string;
  when?: string;
  amount?: string;
};

export type MessageTemplate = {
  /** Meta pre-approved template code used for the WhatsApp send. */
  whatsappTemplate: string;
  /** Ordered body parameters for the Meta template. */
  whatsappParams: (params: MessageParams) => string[];
  whatsapp: (params: MessageParams) => string;
  emailSubject: (params: MessageParams) => string;
  emailBody: (params: MessageParams) => string;
};

export type MessageEvent =
  | "reminder_24h"
  | "order_confirmed"
  | "item_out_of_stock"
  | "partial_order"
  | "order_held"
  | "payment_failed"
  | "list_auto_paused"
  | "list_paused_confirmed"
  | "skip_confirmed"
  | "delay_confirmed";

const en: Record<MessageEvent, MessageTemplate> = {
  reminder_24h: {
    whatsappTemplate: "fresco_reminder_24h",
    whatsappParams: (p) => [p.name, p.when ?? "tomorrow", p.link],
    whatsapp: (p) =>
      `Hi ${p.name}! ${p.when ?? "Tomorrow"}'s grocery order is all set. Need a change? Skip or delay it here: ${p.link}`,
    emailSubject: () => "Your grocery order is all set",
    emailBody: (p) =>
      `Hi ${p.name}!\n\n${p.when ?? "Tomorrow"}'s grocery order is all set and we're looking forward to packing it. Need a change? Skip or delay it here: ${p.link}\n\n— your Fresco neighbours`,
  },
  order_confirmed: {
    whatsappTemplate: "fresco_order_confirmed",
    whatsappParams: (p) => [p.name, p.amount ?? "", p.link],
    whatsapp: (p) =>
      `Thank you, ${p.name}! Your order (${p.amount ?? ""}) is confirmed and we're packing it with care. Track it here: ${p.link}`,
    emailSubject: () => "Your order is confirmed",
    emailBody: (p) =>
      `Thank you, ${p.name}!\n\nYour order (${p.amount ?? ""}) is confirmed and we're packing it with care. Track every step here: ${p.link}\n\n— your Fresco neighbours`,
  },
  item_out_of_stock: {
    whatsappTemplate: "fresco_item_out_of_stock",
    whatsappParams: (p) => [p.name, p.item ?? "one item", p.link],
    whatsapp: (p) =>
      `So sorry, ${p.name}! We're out of ${p.item ?? "one item"} right now. Want us to send the rest of your order? ${p.link}`,
    emailSubject: (p) => `So sorry — ${p.item ?? "one item"} is out of stock`,
    emailBody: (p) =>
      `So sorry, ${p.name}!\n\nWe're out of ${p.item ?? "one item"} right now. Want us to send the rest of your order? Just tap here: ${p.link}\n\n— your Fresco neighbours`,
  },
  partial_order: {
    whatsappTemplate: "fresco_partial_order",
    whatsappParams: (p) => [p.name, p.amount ?? "", p.link],
    whatsapp: (p) =>
      `Hi ${p.name}! A couple of items were short, so we only charged ${p.amount ?? "for what we sent"}. Your box is on its way: ${p.link}`,
    emailSubject: () => "Your order is on its way (with a small change)",
    emailBody: (p) =>
      `Hi ${p.name}!\n\nA couple of items were short today, so we only charged ${p.amount ?? "for what we sent"}. Your box is on its way and you can see exactly what's inside: ${p.link}\n\nSo sorry for the bits we missed — thank you for your patience.\n\n— your Fresco neighbours`,
  },
  order_held: {
    whatsappTemplate: "fresco_order_held",
    whatsappParams: (p) => [p.name, p.link],
    whatsapp: (p) =>
      `Hi ${p.name}! We've paused your order because something's missing. Nothing has been charged. Tell us what to do next: ${p.link}`,
    emailSubject: () => "We've paused your order (nothing charged)",
    emailBody: (p) =>
      `Hi ${p.name}!\n\nWe've paused your order because something's missing, and nothing has been charged. Tell us what you'd like us to do — send the rest, wait, or skip: ${p.link}\n\nSo sorry for the hold-up.\n\n— your Fresco neighbours`,
  },
  payment_failed: {
    whatsappTemplate: "fresco_payment_failed",
    whatsappParams: (p) => [p.name, p.link],
    whatsapp: (p) =>
      `Payment didn't go through this time, ${p.name}. No worries! Update your card here and we'll try again: ${p.link}`,
    emailSubject: () => "A quick card check, please",
    emailBody: (p) =>
      `Hi ${p.name}!\n\nPayment didn't go through this time. No worries — nothing has been charged. Update your card here and we'll try again: ${p.link}\n\nThank you for your patience.\n\n— your Fresco neighbours`,
  },
  list_auto_paused: {
    whatsappTemplate: "fresco_list_auto_paused",
    whatsappParams: (p) => [p.name, p.list ?? "your list", p.link],
    whatsapp: (p) =>
      `Hi ${p.name}! We've paused “${p.list ?? "your list"}” after a few payment hiccups. Everything's saved — resume it here: ${p.link}`,
    emailSubject: (p) => `We've paused “${p.list ?? "your list"}” for you`,
    emailBody: (p) =>
      `Hi ${p.name}!\n\nWe've paused “${p.list ?? "your list"}” after a few payment hiccups, so nothing more will be charged. Everything is saved — resume it whenever you're ready: ${p.link}\n\n— your Fresco neighbours`,
  },
  list_paused_confirmed: {
    whatsappTemplate: "fresco_list_paused",
    whatsappParams: (p) => [p.name, p.list ?? "your list", p.link],
    whatsapp: (p) =>
      `Done, ${p.name}! “${p.list ?? "Your list"}” is paused and everything stays saved. Resume any time here: ${p.link}`,
    emailSubject: (p) => `“${p.list ?? "Your list"}” is paused`,
    emailBody: (p) =>
      `Done, ${p.name}!\n\n“${p.list ?? "Your list"}” is paused and everything stays saved — nothing will be charged. Resume any time here: ${p.link}\n\n— your Fresco neighbours`,
  },
  skip_confirmed: {
    whatsappTemplate: "fresco_skip_confirmed",
    whatsappParams: (p) => [p.name, p.list ?? "your list", p.link],
    whatsapp: (p) =>
      `All set, ${p.name}! We'll skip this delivery of “${p.list ?? "your list"}” and carry on as usual after. Manage it here: ${p.link}`,
    emailSubject: () => "Delivery skipped — you're all set",
    emailBody: (p) =>
      `All set, ${p.name}!\n\nWe'll skip this delivery of “${p.list ?? "your list"}” and carry on as usual afterwards. Manage it any time here: ${p.link}\n\n— your Fresco neighbours`,
  },
  delay_confirmed: {
    whatsappTemplate: "fresco_delay_confirmed",
    whatsappParams: (p) => [p.name, p.when ?? "your new day", p.link],
    whatsapp: (p) =>
      `Moved! ${p.name}, your delivery now arrives ${p.when ?? "on your new day"}. Change it any time here: ${p.link}`,
    emailSubject: () => "Your delivery has moved",
    emailBody: (p) =>
      `Moved!\n\nHi ${p.name}, your delivery now arrives ${p.when ?? "on your new day"}. Change it any time here: ${p.link}\n\n— your Fresco neighbours`,
  },
};

/** Locale registry. Add a locale by adding a sibling record — nothing else changes. */
export const TEMPLATES: Record<string, Record<MessageEvent, MessageTemplate>> = { en };

export const SUPPORTED_LOCALES = Object.keys(TEMPLATES);

export function templateFor(event: MessageEvent, locale = "en"): MessageTemplate {
  return TEMPLATES[locale]?.[event] ?? TEMPLATES.en[event];
}

export function fill(text: string, params: MessageParams) {
  return text
    .replaceAll("{name}", params.name)
    .replaceAll("{link}", params.link)
    .replaceAll("{item}", params.item ?? "")
    .replaceAll("{list}", params.list ?? "")
    .replaceAll("{when}", params.when ?? "")
    .replaceAll("{amount}", params.amount ?? "");
}

export const MESSAGE_CHAR_LIMIT = 300;

/** Runtime guard: a rendered WhatsApp body must stay inside the template limit. */
export function renderWhatsapp(event: MessageEvent, params: MessageParams, locale = "en") {
  const template = templateFor(event, locale);
  const body = template.whatsapp(params);
  return { body, template, withinLimit: body.length <= MESSAGE_CHAR_LIMIT };
}
