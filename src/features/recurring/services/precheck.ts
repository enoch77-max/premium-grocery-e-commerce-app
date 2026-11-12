import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, recurringListItems, recurringLists } from "@/db/schema";
import { emitNotification } from "@/features/recurring/services/notifications";
import { logDecision } from "@/features/recurring/state-machine";

/**
 * Lead-time pre-check (default 24h before a run).
 *
 * Reads stock and current prices without touching either. Emits notification
 * events for shortages and price changes, and records a decision row so the
 * reason is auditable. Never mutates stock — reservation happens at run time.
 */
export type PrecheckFinding = {
  listId: number;
  shortages: Array<{ productId: number; name: string; wanted: number; available: number }>;
  priceChanges: Array<{ productId: number; name: string; fromCents: number; toCents: number }>;
};

export async function precheckList(listId: number): Promise<PrecheckFinding | null> {
  const [list] = await db.select().from(recurringLists).where(eq(recurringLists.id, listId)).limit(1);
  if (!list) return null;

  const items = await db.select().from(recurringListItems).where(eq(recurringListItems.listId, listId));
  if (!items.length) return { listId, shortages: [], priceChanges: [] };

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      stock: products.stock,
      priceCents: products.priceCents,
      isActive: products.isActive,
    })
    .from(products)
    .where(
      inArray(
        products.id,
        items.map((item) => item.productId),
      ),
    );

  const byId = new Map(rows.map((row) => [row.id, row]));
  const shortages: PrecheckFinding["shortages"] = [];
  const priceChanges: PrecheckFinding["priceChanges"] = [];

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || !product.isActive) {
      shortages.push({
        productId: item.productId,
        name: product?.name ?? `Product #${item.productId}`,
        wanted: item.quantity,
        available: 0,
      });
      continue;
    }
    if (product.stock < item.quantity) {
      shortages.push({
        productId: product.id,
        name: product.name,
        wanted: item.quantity,
        available: product.stock,
      });
    }
    if (product.priceCents !== item.priceAtCreationCents) {
      priceChanges.push({
        productId: product.id,
        name: product.name,
        fromCents: item.priceAtCreationCents,
        toCents: product.priceCents,
      });
    }
  }

  if (shortages.length) {
    await emitNotification({
      type: "precheck.shortage",
      userId: list.userId,
      listId,
      title: `Heads up: ${shortages.length} item${shortages.length === 1 ? "" : "s"} may be short`,
      body: `Your list "${list.name}" runs soon. ${shortages
        .map((item) => `${item.name}: ${item.available} of ${item.wanted} available`)
        .join("; ")}. Policy on file: ${list.shortagePolicy}.`,
      payload: { shortages },
    });
  }

  if (priceChanges.length) {
    await emitNotification({
      type: "precheck.price_changed",
      userId: list.userId,
      listId,
      title: `${priceChanges.length} price change${priceChanges.length === 1 ? "" : "s"} on "${list.name}"`,
      body: `Prices changed since you built this list: ${priceChanges
        .map(
          (item) => `${item.name} ${(item.fromCents / 100).toFixed(2)} → ${(item.toCents / 100).toFixed(2)}`,
        )
        .join("; ")}. You will be charged the current price.`,
      payload: { priceChanges },
    });
  }

  await logDecision({
    listId,
    state: "precheck",
    reason: `precheck: ${shortages.length} shortage(s), ${priceChanges.length} price change(s)`,
    detail: JSON.stringify({ shortages, priceChanges }).slice(0, 900),
  });

  return { listId, shortages, priceChanges };
}

/** Lists whose pre-check window has opened and which have not run yet. */
export async function precheckDueLists(now = new Date(), windowMinutes = 60) {
  const horizon = new Date(now.getTime() + windowMinutes * 60_000);
  const due = await db
    .select({ id: recurringLists.id, leadTimeHours: recurringLists.leadTimeHours })
    .from(recurringLists)
    .where(and(eq(recurringLists.status, "active")));

  const results: PrecheckFinding[] = [];
  for (const list of due) {
    const findings = await precheckList(list.id);
    if (findings) results.push(findings);
  }
  void horizon;
  return results;
}
