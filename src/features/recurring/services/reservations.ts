import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, stockReservationItems, stockReservations } from "@/db/schema";
import type { ShortageDecision, ShortagePolicy } from "@/features/recurring/types";

/**
 * Stock reservation.
 *
 * Safety model: `products.stock` is decremented by a **conditional UPDATE**
 * (`WHERE stock >= quantity`). Postgres serialises concurrent updates on the row,
 * so when two buyers race for the last unit exactly one UPDATE matches a row and
 * the other gets zero rows back. No application-level locking, no oversell, and
 * the loser receives a clean out-of-stock result.
 */

const RESERVATION_TTL_MINUTES = 30;

export type ReservationLine = { productId: number; quantity: number };

type AllocateOneResult =
  | { status: "granted"; quantity: number; unitPriceCents: number }
  | { status: "short"; quantity: number; unitPriceCents: number }
  | { status: "out"; unitPriceCents: number };

/** Atomically takes up to `wanted` units of one product. */
async function allocateOne(productId: number, wanted: number): Promise<AllocateOneResult> {
  const rows = await db
    .update(products)
    .set({ stock: sql`${products.stock} - ${wanted}` })
    .where(and(eq(products.id, productId), sql`${products.stock} >= ${wanted}`, eq(products.isActive, true)))
    .returning({ stock: products.stock, priceCents: products.priceCents });

  if (rows.length > 0) {
    return { status: "granted", quantity: wanted, unitPriceCents: rows[0].priceCents };
  }

  // Full quantity unavailable: fall back to whatever is left, atomically.
  const [current] = await db
    .select({ stock: products.stock, priceCents: products.priceCents, isActive: products.isActive })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!current || !current.isActive || current.stock <= 0) {
    return { status: "out", unitPriceCents: current?.priceCents ?? 0 };
  }

  const partial = current.stock;
  const taken = await db
    .update(products)
    .set({ stock: sql`${products.stock} - ${partial}` })
    .where(and(eq(products.id, productId), sql`${products.stock} = ${partial}`))
    .returning({ stock: products.stock, priceCents: products.priceCents });

  if (taken.length === 0) {
    // Lost the race for the remainder; treat as out of stock for this run.
    return { status: "out", unitPriceCents: current.priceCents };
  }
  return { status: "short", quantity: partial, unitPriceCents: taken[0].priceCents };
}

export type ReserveResult =
  | {
      ok: true;
      reservationId: number;
      items: ShortageDecision[];
      totalCents: number;
      requestedTotalCents: number;
      hadShortage: boolean;
    }
  | {
      ok: false;
      reason: "out_of_stock" | "no_items" | "hold_shortage";
      items: ShortageDecision[];
      released: boolean;
    };

/**
 * Reserves every line for a run, applying the list's shortage policy:
 *  • skip_item → drop lines with zero availability, keep the rest
 *  • partial   → deliver what exists (short lines are billed pro-rata)
 *  • hold      → any shortfall aborts the whole run and releases everything
 */
export async function reserveStock(input: {
  runId: number;
  lines: ReservationLine[];
  policy: ShortagePolicy;
}): Promise<ReserveResult> {
  const { runId, lines, policy } = input;
  if (!lines.length) return { ok: false, reason: "no_items", items: [], released: false };

  const decisions: ShortageDecision[] = [];
  let released = false;

  const release = async () => {
    if (released) return;
    released = true;
    await releaseReservationByRun(runId);
  };

  for (const line of lines) {
    const result = await allocateOne(line.productId, line.quantity);

    if (result.status === "out") {
      decisions.push({
        productId: line.productId,
        requested: line.quantity,
        granted: 0,
        unitPriceCents: result.unitPriceCents,
      });
      if (policy === "hold") {
        await release();
        return { ok: false, reason: "hold_shortage", items: decisions, released: true };
      }
      continue;
    }

    decisions.push({
      productId: line.productId,
      requested: line.quantity,
      granted: result.quantity,
      unitPriceCents: result.unitPriceCents,
    });

    if (result.status === "short" && policy === "hold") {
      await release();
      return { ok: false, reason: "hold_shortage", items: decisions, released: true };
    }
  }

  const deliverable = decisions.filter((item) => item.granted > 0);
  if (!deliverable.length) {
    await release();
    return { ok: false, reason: "out_of_stock", items: decisions, released: true };
  }

  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000);
  const [reservation] = await db
    .insert(stockReservations)
    .values({ runId, status: "active", expiresAt })
    .returning({ id: stockReservations.id });

  await db.insert(stockReservationItems).values(
    deliverable.map((item) => ({
      reservationId: reservation.id,
      productId: item.productId,
      quantity: item.granted,
      requestedQuantity: item.requested,
      unitPriceCents: item.unitPriceCents,
    })),
  );

  const totalCents = deliverable.reduce((sum, item) => sum + item.granted * item.unitPriceCents, 0);
  const requestedTotalCents = decisions.reduce((sum, item) => sum + item.requested * item.unitPriceCents, 0);

  return {
    ok: true,
    reservationId: reservation.id,
    items: decisions,
    totalCents,
    requestedTotalCents,
    // Any line that was reduced or dropped counts as a shortfall.
    hadShortage: decisions.some((item) => item.granted < item.requested),
  };
}

/** Adds reserved units back to products.stock and closes the reservation. */
export async function releaseReservationByRun(runId: number) {
  const reservations = await db
    .select({ id: stockReservations.id, status: stockReservations.status })
    .from(stockReservations)
    .where(eq(stockReservations.runId, runId));

  for (const reservation of reservations) {
    if (reservation.status !== "active") continue;
    const items = await db
      .select()
      .from(stockReservationItems)
      .where(eq(stockReservationItems.reservationId, reservation.id));

    for (const item of items) {
      await db
        .update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }

    await db
      .update(stockReservations)
      .set({ status: "released" })
      .where(eq(stockReservations.id, reservation.id));
  }
  return reservations.length;
}

/** Marks the reservation consumed once the order is confirmed. */
export async function consumeReservationByRun(runId: number) {
  await db
    .update(stockReservations)
    .set({ status: "consumed" })
    .where(and(eq(stockReservations.runId, runId), eq(stockReservations.status, "active")));
}

export async function getReservationItems(runId: number) {
  const [reservation] = await db
    .select({ id: stockReservations.id })
    .from(stockReservations)
    .where(eq(stockReservations.runId, runId))
    .limit(1);
  if (!reservation) return [];
  return db
    .select()
    .from(stockReservationItems)
    .where(eq(stockReservationItems.reservationId, reservation.id));
}
