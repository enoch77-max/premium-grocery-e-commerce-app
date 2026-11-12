import { db } from "@/db";
import { notificationEvents } from "@/db/schema";

/**
 * Notification outbox.
 *
 * This store has no transactional email/SMS transport configured yet (see
 * docs/GO-LIVE.md). Rather than pretend to send, every recurring-order event is
 * written to `notification_events` with status "pending"; a transport worker can
 * drain it later, and the admin/customer APIs expose the same rows. Dispatch is
 * best-effort and never blocks the scheduler.
 */

export type NotificationType =
  | "precheck.shortage"
  | "precheck.price_changed"
  | "run.reserved"
  | "run.confirmed"
  | "run.partially_fulfilled"
  | "run.payment_failed"
  | "run.retry_scheduled"
  | "run.paused"
  | "run.held"
  | "run.skipped";

export type RecurringNotificationType = NotificationType | "run.reminder" | "run.item_out_of_stock" | "run.delayed";

export async function emitNotification(input: {
  type: RecurringNotificationType;
  userId?: number | null;
  listId?: number | null;
  runId?: number | null;
  title: string;
  body: string;
  actor?: string;
  payload?: Record<string, unknown>;
}) {
  try {
    const [row] = await db
      .insert(notificationEvents)
      .values({
        userId: input.userId ?? null,
        listId: input.listId ?? null,
        runId: input.runId ?? null,
        type: input.type,
        title: input.title.slice(0, 160),
        body: input.body.slice(0, 1000),
        payload: JSON.stringify({ actor: input.actor ?? "scheduler", ...(input.payload ?? {}) }),
      })
      .returning({ id: notificationEvents.id });

    // Hand straight to the outbox dispatcher (WhatsApp → email fallback).
    // Failures here never break the fulfilment path.
    if (row?.id) {
      void import("@/features/notifications/dispatch")
        .then((mod) => mod.dispatchNotification(row.id as number))
        .catch((error) => console.error("dispatch failed", error));
    }
    return row?.id ?? null;
  } catch (error) {
    // Alerts must never break fulfilment.
    console.error("emitNotification failed", error);
    return null;
  }
}
