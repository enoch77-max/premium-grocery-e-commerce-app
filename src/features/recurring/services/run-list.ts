import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  orderItems,
  orders,
  paymentMethods,
  recurringListItems,
  recurringLists,
  recurringRuns,
} from "@/db/schema";
import { orderNumber } from "@/lib/format";
import { getPaymentProvider } from "@/features/recurring/payments/provider";
import {
  reserveStock,
  releaseReservationByRun,
  consumeReservationByRun,
} from "@/features/recurring/services/reservations";
import { emitNotification } from "@/features/recurring/services/notifications";
import { logDecision, transitionRun } from "@/features/recurring/state-machine";
import { nextOccurrence } from "@/features/recurring/time";
import type { Cadence, RunState, ShortagePolicy } from "@/features/recurring/types";

/**
 * Executes one occurrence of a recurring list.
 *
 * Order of operations is fixed: reserve stock → charge → confirm. If the charge
 * fails, the reservation is released so nothing is held against a customer who
 * was never billed. Retries: up to 3 attempts spread over 48 hours; each attempt
 * notifies the customer; after the last failure the list auto-pauses.
 */

export const MAX_ATTEMPTS = 3;
/** Delay before attempt N (index 0 unused): 1h, then 23h — fits inside 48h. */
export const RETRY_DELAYS_MINUTES = [0, 60, 23 * 60];

type RunRow = typeof recurringRuns.$inferSelect;
type ListRow = typeof recurringLists.$inferSelect;

export type RunOutcome = {
  runId: number;
  state: RunState;
  reason: string;
  orderNumber?: string | null;
  amountCents?: number;
};

export async function executeRun(run: RunRow, list: ListRow): Promise<RunOutcome> {
  // ── 1. RESERVE ───────────────────────────────────────────────────────────
  const items = await db.select().from(recurringListItems).where(eq(recurringListItems.listId, list.id));
  const reservation = await reserveStock({
    runId: run.id,
    policy: list.shortagePolicy as ShortagePolicy,
    lines: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
  });

  if (!reservation.ok) {
    const reason =
      reservation.reason === "hold_shortage"
        ? "shortage policy 'hold': run held, nothing was charged"
        : reservation.reason === "out_of_stock"
          ? "no items available: run held, nothing was charged"
          : "list has no items";

    await transitionRun({
      runId: run.id,
      listId: list.id,
      from: "scheduled",
      to: "held",
      reason,
      patch: { failureCode: reservation.reason, failureMessage: reason },
    });
    await emitNotification({
      type: "run.held",
      userId: list.userId,
      listId: list.id,
      runId: run.id,
      title: `"${list.name}" was held`,
      body: `${reason}. You have not been charged. Pause, edit, or resume the list when you are ready.`,
    });
    await bumpAfterRun(list, run);
    return { runId: run.id, state: "held", reason };
  }

  await transitionRun({
    runId: run.id,
    listId: list.id,
    from: "scheduled",
    to: "reserved",
    reason: `reserved ${reservation.items.filter((i) => i.granted > 0).length} line(s), ${reservation.totalCents}c`,
    patch: {
      amountCents: reservation.totalCents,
      priceChanged: reservation.totalCents !== reservation.requestedTotalCents,
    },
  });

  const dropped = reservation.items.filter((item) => item.granted === 0);
  if (dropped.length) {
    const names = await droppedItemNames(dropped.map((item) => item.productId));
    await emitNotification({
      type: "run.item_out_of_stock",
      userId: list.userId,
      listId: list.id,
      runId: run.id,
      title: `Out of stock: ${names.join(", ")}`,
      body: `We couldn't get ${names.join(", ")} for "${list.name}".`,
      payload: { item: names.join(", "), listId: list.id },
    });
  }

  await emitNotification({
    type: "run.reserved",
    userId: list.userId,
    listId: list.id,
    runId: run.id,
    title: `"${list.name}" is being prepared`,
    body: `We reserved ${reservation.items.filter((i) => i.granted > 0).length} item(s) and will charge your saved card.`,
  });

  // ── 2. CHARGE ────────────────────────────────────────────────────────────
  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.id, list.paymentMethodId))
    .limit(1);

  const provider = getPaymentProvider();
  let chargeResult =
    method && provider.supportsOffSessionTokenCharges
      ? await provider.charge({
          amountCents: reservation.totalCents,
          currency: "usd",
          idempotencyKey: run.idempotencyKey,
          customerToken: method.gatewayCustomerToken,
          paymentMethodToken: method.gatewayPaymentMethodToken,
          description: `Recurring order — ${list.name}`,
          metadata: { listId: String(list.id), runId: String(run.id) },
        })
      : {
          ok: false as const,
          code: method ? "gateway_unavailable" : "no_payment_method",
          message: method
            ? "No payment gateway is configured, so no charge was attempted."
            : "This list has no saved payment method.",
          retryable: false,
        };

  if ("ok" in chargeResult && chargeResult.ok === false) {
    await releaseReservationByRun(run.id);

    const attempt = run.attemptCount + 1;
    const canRetry = chargeResult.retryable && attempt < MAX_ATTEMPTS;
    const nextAttemptAt = canRetry
      ? new Date(
          Date.now() + RETRY_DELAYS_MINUTES[Math.min(attempt, RETRY_DELAYS_MINUTES.length - 1)] * 60_000,
        )
      : null;

    await transitionRun({
      runId: run.id,
      listId: list.id,
      from: "reserved",
      to: "held",
      reason: `charge failed (${chargeResult.code}); stock released`,
      patch: {
        attemptCount: attempt,
        nextAttemptAt,
        failureCode: chargeResult.code,
        failureMessage: chargeResult.message,
      },
    });

    await emitNotification({
      type: "run.payment_failed",
      userId: list.userId,
      listId: list.id,
      runId: run.id,
      title: `Payment failed for "${list.name}"`,
      body: `${chargeResult.message} ${canRetry ? `We'll retry automatically (attempt ${attempt + 1} of ${MAX_ATTEMPTS}).` : "No more retries."} Reserved stock has been released, so nothing is held and nothing was billed.`,
      payload: { code: chargeResult.code, attempt },
    });

    if (!canRetry) {
      await pauseList(list.id, `payment_${chargeResult.code}`, "three failed charge attempts");
      await emitNotification({
        type: "run.paused",
        userId: list.userId,
        listId: list.id,
        runId: run.id,
        title: `"${list.name}" has been paused`,
        body: `We stopped this list after repeated payment failures. Update your card and resume whenever you like — the list is still saved.`,
      });
      return { runId: run.id, state: "held", reason: `charge failed: ${chargeResult.code}` };
    }

    if (canRetry) {
      await emitNotification({
        type: "run.retry_scheduled",
        userId: list.userId,
        listId: list.id,
        runId: run.id,
        title: `We'll retry "${list.name}"`,
        body: `Next attempt: ${nextAttemptAt?.toISOString() ?? "soon"}.`,
      });
    }
    return { runId: run.id, state: "held", reason: `charge failed: ${chargeResult.code}` };
  }

  const chargeToken = chargeResult.ok ? chargeResult.chargeToken : "";

  // ── 3. CONFIRM ───────────────────────────────────────────────────────────
  await transitionRun({
    runId: run.id,
    listId: list.id,
    from: "reserved",
    to: "charged",
    reason: `charged ${reservation.totalCents}c via ${provider.name}`,
    patch: { chargeToken, attemptCount: run.attemptCount + 1 },
  });

  const number = orderNumber();
  const deliverable = reservation.items.filter((item) => item.granted > 0);
  const productRows = await db.execute<{
    id: number;
    slug: string;
    name: string;
    unit: string;
    image_url: string;
    price_cents: number;
  }>(
    sql`select id, slug, name, unit, image_url, price_cents from products where id in ${sql.raw(
      `(${deliverable.map((item) => item.productId).join(",")})`,
    )}`,
  );

  const byId = new Map(productRows.rows.map((row) => [row.id, row]));
  const subtotal = reservation.totalCents;

  try {
    await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber: number,
          checkoutId: `recurring:${run.id}`,
          userId: list.userId,
          customerName: list.name,
          email: "",
          phone: "",
          address: list.addressLine1 || "Saved address",
          city: list.addressCity || "—",
          postcode: list.addressPostcode || "—",
          deliverySlot: "recurring",
          paymentMethod: method?.brand ?? "card",
          notes: `Recurring list: ${list.name}`,
          subtotalCents: subtotal,
          savingsCents: 0,
          deliveryCents: 0,
          discountCents: 0,
          totalCents: subtotal,
          itemCount: deliverable.reduce((sum, item) => sum + item.granted, 0),
          status: "confirmed",
        })
        .returning({ id: orders.id });

      const productLines = deliverable.map((item) => {
        const product = byId.get(item.productId);
        return {
          orderId: order.id,
          productSlug: product?.slug ?? `product-${item.productId}`,
          name: product?.name ?? `Product #${item.productId}`,
          unit: product?.unit ?? "",
          imageUrl: product?.image_url ?? "",
          priceCents: item.unitPriceCents,
          compareAtCents: null,
          quantity: item.granted,
        };
      });
      if (productLines.length) await tx.insert(orderItems).values(productLines);
    });
  } catch (error) {
    // Idempotency guard: the unique checkoutId means a replayed confirm returns
    // the existing order rather than charging twice.
    console.error("recurring order insert failed", error);
    await releaseReservationByRun(run.id);
    return { runId: run.id, state: "failed", reason: "order insert failed" };
  }

  await consumeReservationByRun(run.id);
  // A completely unavailable item is also a partial fulfilment.
  const partial = reservation.items.some((item) => item.granted < item.requested);
  const finalState: RunState = partial ? "partially_fulfilled" : "confirmed";

  await transitionRun({
    runId: run.id,
    listId: list.id,
    from: "charged",
    to: finalState,
    reason: partial ? "confirmed with shortfall" : "confirmed in full",
    patch: { orderNumber: number, orderId: null },
  });

  await emitNotification({
    type: partial ? "run.partially_fulfilled" : "run.confirmed",
    userId: list.userId,
    listId: list.id,
    runId: run.id,
    title: partial ? `Partly fulfilled: "${list.name}"` : `Order placed: "${list.name}"`,
    body: partial
      ? `Some items were short, so we billed only what we are sending (${(subtotal / 100).toFixed(2)}). Order ${number}.`
      : `Charged ${(subtotal / 100).toFixed(2)}. Order ${number}.`,
    payload: { orderNumber: number, items: deliverable, amountCents: subtotal, listId: list.id, scheduledFor: run.scheduledFor?.toISOString?.() ?? undefined },
  });

  await bumpAfterRun(list, run);
  await logDecision({
    listId: list.id,
    runId: run.id,
    state: finalState,
    reason: `completed: ${number}`,
  });

  return {
    runId: run.id,
    state: finalState,
    reason: "confirmed",
    orderNumber: number,
    amountCents: subtotal,
  };
}

async function droppedItemNames(productIds: number[]) {
  if (!productIds.length) return ["one item"];
  const rows = await db.execute<{ name: string }>(sql`select name from products where id in (${sql.join(
    productIds.map((id) => sql`${id}`),
    sql`,`,
  )})`);
  return rows.rows.map((row) => row.name);
}

/** Advances the list to its next occurrence and records the outcome. */
async function bumpAfterRun(list: ListRow, run: RunRow) {
  const next = nextOccurrence({
    cadence: list.cadence as Cadence,
    localTime: list.localTime,
    timeZone: list.timezone,
    anchorDay: list.anchorDay,
    anchorWeekday: list.anchorWeekday,
    after: run.scheduledFor,
  });

  await db
    .update(recurringLists)
    .set({
      lastRunAt: new Date(),
      nextRunAt: next,
      completedRuns: sql`${recurringLists.completedRuns} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(recurringLists.id, list.id));
}

export async function pauseList(listId: number, reason: string, detail: string) {
  await db
    .update(recurringLists)
    .set({ status: "paused", pausedReason: reason, updatedAt: new Date() })
    .where(and(eq(recurringLists.id, listId), eq(recurringLists.status, "active")));
  await logDecision({ listId, state: "paused", reason, detail, actor: "scheduler" });
}

/** Retries runs whose backoff window has elapsed. */
export async function retryDueRuns(now = new Date()) {
  const due = await db
    .select()
    .from(recurringRuns)
    .where(and(eq(recurringRuns.state, "held"), sql`${recurringRuns.nextAttemptAt} <= ${now}`));

  const results: RunOutcome[] = [];
  for (const run of due) {
    const [list] = await db.select().from(recurringLists).where(eq(recurringLists.id, run.listId)).limit(1);
    if (!list) continue;

    // Re-open the run for another attempt.
    await db
      .update(recurringRuns)
      .set({ state: "scheduled", nextAttemptAt: null, updatedAt: new Date() })
      .where(eq(recurringRuns.id, run.id));
    results.push(await executeRun({ ...run, state: "scheduled" }, list));
  }
  return results;
}
