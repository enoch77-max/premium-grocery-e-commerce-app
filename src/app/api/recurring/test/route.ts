import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, recurringLists, recurringRuns } from "@/db/schema";
import { setPaymentProviderForTests } from "@/features/recurring/payments/provider";
import { emitDueReminders, runScheduler } from "@/features/recurring/services/scheduler";
import { notificationEvents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { renderWhatsapp, type MessageEvent, type MessageParams } from "@/features/notifications/templates";
import { getReservationItems } from "@/features/recurring/services/reservations";
import type { PaymentChargeResult } from "@/features/recurring/types";

export const dynamic = "force-dynamic";

/**
 * Deterministic test controls.
 *
 * Hard-disabled unless RECURRING_TEST_HOOKS=1, which is never set in production
 * (documented in .env.example as off). This exists so the automated suite can
 * make a payment decline, freeze time, and drive the scheduler without a network
 * gateway — the alternative would be faking the charge, which we refuse to do.
 */
function guard() {
  if (process.env.RECURRING_TEST_HOOKS !== "1") {
    return Response.json({ error: "Test hooks disabled" }, { status: 404 });
  }
  return null;
}

export async function POST(request: Request) {
  const blocked = guard();
  if (blocked) return blocked;

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    outcome?: "success" | "decline" | "expired_card" | "authentication_required" | "network";
    productId?: number;
    stock?: number;
    listId?: number;
    listIds?: number[];
    nextRunAt?: string;
    now?: string;
    mode?: string;
    params?: Record<string, string>;
    email?: string;
    role?: string;
  };

  if (body.action === "set-payment-outcome") {
    const outcome = body.outcome ?? "success";
    setPaymentProviderForTests({
      name: "test",
      supportsOffSessionTokenCharges: true,
      async charge(): Promise<PaymentChargeResult> {
        if (outcome === "success") {
          return { ok: true, chargeToken: `ch_test_${Date.now()}` };
        }
        return {
          ok: false,
          code: outcome,
          message: `Deterministic test ${outcome}`,
          retryable: outcome === "decline" || outcome === "network",
        };
      },
    });
    return Response.json({ ok: true, outcome });
  }

  if (body.action === "set-stock" && body.productId !== undefined) {
    await db
      .update(products)
      .set({ stock: Math.max(0, Number(body.stock ?? 0)) })
      .where(eq(products.id, Number(body.productId)));
    return Response.json({ ok: true, productId: body.productId, stock: body.stock });
  }

  if (body.action === "make-due" && body.listId !== undefined) {
    await db
      .update(recurringLists)
      .set({ nextRunAt: new Date(body.nextRunAt ?? new Date(Date.now() - 60_000).toISOString()) })
      .where(eq(recurringLists.id, Number(body.listId)));
    return Response.json({ ok: true });
  }

  if (body.action === "template-lengths") {
    const params = (body.params ?? {}) as MessageParams;
    const events: MessageEvent[] = [
      "reminder_24h",
      "order_confirmed",
      "item_out_of_stock",
      "partial_order",
      "order_held",
      "payment_failed",
      "list_auto_paused",
      "list_paused_confirmed",
      "skip_confirmed",
      "delay_confirmed",
    ];
    const results = events.map((event) => {
      const rendered = renderWhatsapp(event, params, "en");
      return { event, length: rendered.body.length, withinLimit: rendered.withinLimit };
    });
    return Response.json({ ok: true, results });
  }

  if (body.action === "outbox") {
    const rows = await db
      .select()
      .from(notificationEvents)
      .orderBy(desc(notificationEvents.createdAt))
      .limit(50);
    return Response.json({ ok: true, rows });
  }

  if (body.action === "run-scheduler" && body.mode === "reminders-only") {
    const emitted = await emitDueReminders();
    return Response.json({ ok: true, emitted });
  }

  if (body.action === "run-scheduler") {
    const result = await runScheduler({
      now: body.now ? new Date(body.now) : new Date(),
      listIds: Array.isArray(body.listIds) && body.listIds.length ? body.listIds.map(Number) : undefined,
    });
    return Response.json({ ok: true, result });
  }

  if (body.action === "set-role" && body.email && body.role) {
    await db.execute(sql`update users set role = ${body.role} where email = ${body.email}`);
    return Response.json({ ok: true });
  }

  /** Removes every recurring artefact created by the automated suite. */
  if (body.action === "reset-data") {
    await db.execute(sql`delete from stock_reservation_items`);
    await db.execute(sql`delete from stock_reservations`);
    await db.execute(sql`delete from recurring_run_events`);
    await db.execute(sql`delete from recurring_runs`);
    await db.execute(sql`delete from recurring_list_items`);
    await db.execute(sql`delete from recurring_lists`);
    await db.execute(sql`delete from payment_methods`);
    await db.execute(sql`delete from notification_events`);
    return Response.json({ ok: true });
  }

  if (body.action === "reset") {
    setPaymentProviderForTests(null);
    return Response.json({ ok: true });
  }

  if (body.action === "run-detail") {
    const [run] = await db
      .select()
      .from(recurringRuns)
      .where(eq(recurringRuns.id, Number(body.listId)))
      .limit(1);
    const items = run ? await getReservationItems(run.id) : [];
    return Response.json({ run: run ?? null, reservationItems: items });
  }

  return Response.json({ error: "Unknown action" }, { status: 422 });
}
