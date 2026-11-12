import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notificationEvents, recurringLists, users } from "@/db/schema";
import { friendlyDate } from "@/features/recurring/ui/copy";
import {
  fill,
  renderWhatsapp,
  templateFor,
  type MessageEvent,
  type MessageParams,
} from "@/features/notifications/templates";
import { sendEmail } from "@/features/notifications/providers/email";
import { NoTransport, sendWhatsApp, toE164 } from "@/features/notifications/providers/whatsapp";
import { formatMoney } from "@/lib/format";

/**
 * Outbox dispatcher.
 *
 * Channel choice follows the customer's saved preference: WhatsApp first when
 * they opted in, then email — and if WhatsApp fails we fall back to email.
 * With no transport configured we mark the event failed with `no_transport`
 * (never fake a send) and leave the in-app outbox as the record.
 */

type Transport = {
  sendWhatsApp: typeof sendWhatsApp;
  sendEmail: typeof sendEmail;
};

let testTransport: Transport | null = null;

export function setTransportForTests(transport: Transport | null) {
  if (process.env.RECURRING_TEST_HOOKS !== "1") {
    throw new Error("setTransportForTests requires RECURRING_TEST_HOOKS=1");
  }
  testTransport = transport;
}

function transport(): Transport {
  return testTransport ?? { sendWhatsApp, sendEmail };
}

/** Maps an outbox row type to a customer-facing template event. */
export function eventFor(type: string, actor: string): MessageEvent | null {
  switch (type) {
    case "run.reminder":
      return "reminder_24h";
    case "run.confirmed":
      return "order_confirmed";
    case "run.item_out_of_stock":
      return "item_out_of_stock";
    case "run.partially_fulfilled":
      return "partial_order";
    case "run.held":
      return "order_held";
    case "run.payment_failed":
      return "payment_failed";
    case "run.paused":
      return actor.startsWith("user:") ? "list_paused_confirmed" : "list_auto_paused";
    case "run.skipped":
      return "skip_confirmed";
    case "run.delayed":
      return "delay_confirmed";
    default:
      return null;
  }
}

function baseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** One clear action link per message, always into the customer's own console. */
function linkFor(event: MessageEvent, listId: number | null) {
  const base = baseUrl();
  switch (event) {
    case "reminder_24h":
    case "skip_confirmed":
    case "delay_confirmed":
    case "list_auto_paused":
    case "list_paused_confirmed":
      return `${base}/account/recurring`;
    case "payment_failed":
      return `${base}/account/recurring`;
    default:
      return listId ? `${base}/account/recurring/${listId}` : `${base}/account/recurring`;
  }
}

export type DispatchOutcome = {
  status: "dispatched" | "failed";
  channel: "whatsapp" | "email" | null;
  failureCode?: string;
  message?: string;
  providerMessageId?: string;
  body?: string;
};

export async function dispatchNotification(rowId: number): Promise<DispatchOutcome | null> {
  const [row] = await db.select().from(notificationEvents).where(eq(notificationEvents.id, rowId)).limit(1);
  if (!row) return null;
  if (row.status === "dispatched") return { status: "dispatched", channel: row.channel as "whatsapp" | "email" };

  const actor = (JSON.parse(row.payload || "{}") as { actor?: string }).actor ?? "scheduler";
  const event = eventFor(row.type, actor);
  if (!event) return null;

  const user = row.userId
    ? ((await db.select().from(users).where(eq(users.id, row.userId)).limit(1))[0] ?? null)
    : null;

  const payload = JSON.parse(row.payload || "{}") as {
    listId?: number;
    item?: string;
    when?: string;
    amountCents?: number;
    scheduledFor?: string;
  };

  const listId = payload.listId ?? row.listId ?? null;
  const list = listId
    ? ((await db.select().from(recurringLists).where(eq(recurringLists.id, listId)).limit(1))[0] ?? null)
    : null;

  const params: MessageParams = {
    name: (user?.name ?? "friend").split(" ")[0],
    link: linkFor(event, listId),
    item: payload.item,
    list: list?.name,
    when: payload.when ?? (payload.scheduledFor ? friendlyDate(payload.scheduledFor) : undefined),
    amount: payload.amountCents !== undefined ? formatMoney(payload.amountCents) : undefined,
  };

  const locale = row.locale || "en";
  const template = templateFor(event, locale);
  const { body, withinLimit } = renderWhatsapp(event, params, locale);
  if (!withinLimit) {
    // Authored templates are short; this guard catches a bad param (long name).
    params.item = params.item?.slice(0, 40);
    params.list = params.list?.slice(0, 40);
  }

  const preferWhatsapp = Boolean(user?.notifyWhatsapp && user?.whatsappNumber);
  const allowEmail = Boolean(user?.notifyEmail !== false && user?.email);
  const { sendWhatsApp: wa, sendEmail: em } = transport();

  let lastFailure: { code: string; message: string } | null = null;

  if (preferWhatsapp) {
    try {
      const result = await wa({
        toE164: toE164(user?.whatsappNumber ?? ""),
        template,
        params: template.whatsappParams(params),
        locale,
      });
      if (result.ok) return finish(rowId, "whatsapp", result.providerMessageId, fill(template.emailBody(params), params));
      lastFailure = { code: result.code, message: result.message };
    } catch (error) {
      if (error instanceof NoTransport) lastFailure = { code: "no_transport", message: error.message };
      else lastFailure = { code: "whatsapp_error", message: String(error) };
    }
  }

  if (allowEmail) {
    const subject = template.emailSubject(params);
    const text = fill(template.emailBody(params), params);
    try {
      const result = await em({ to: user?.email ?? "", subject, body: text });
      if (result.ok) return finish(rowId, "email", result.providerMessageId, text);
      lastFailure = { code: result.code, message: result.message };
    } catch (error) {
      if (error instanceof NoTransport) lastFailure = { code: "no_transport", message: error.message };
      else lastFailure = { code: "email_error", message: String(error) };
    }
  }

  const failure = lastFailure ?? { code: "no_preference", message: "Customer has no enabled channel" };
  await db
    .update(notificationEvents)
    .set({
      status: "failed",
      failureCode: failure.code,
      attempts: row.attempts + 1,
      payload: JSON.stringify({ ...JSON.parse(row.payload || "{}"), failure: failure.message, renderedBody: body }),
    })
    .where(eq(notificationEvents.id, rowId));

  return { status: "failed", channel: null, failureCode: failure.code, message: failure.message, body };
}

async function finish(rowId: number, channel: "whatsapp" | "email", providerMessageId: string, body: string) {
  await db
    .update(notificationEvents)
    .set({
      status: "dispatched",
      channel,
      providerMessageId,
      sentAt: new Date(),
      attempts: 1,
      payload: JSON.stringify({ renderedBody: body }),
    })
    .where(eq(notificationEvents.id, rowId));
  return { status: "dispatched" as const, channel, providerMessageId, body };
}

/** Drains pending rows — called from the cron tick so nothing sits forever. */
export async function dispatchPending(limit = 25) {
  const rows = await db
    .select({ id: notificationEvents.id })
    .from(notificationEvents)
    .where(eq(notificationEvents.status, "pending"))
    .limit(limit);
  const outcomes = [];
  for (const row of rows) {
    outcomes.push(await dispatchNotification(row.id));
  }
  return outcomes;
}
