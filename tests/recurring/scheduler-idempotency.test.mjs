import { test } from "node:test";
import {
  assert,
  hook,
  productByQuery,
  resetRecurringData,
  runSchedulerFor,
  seedList,
  listState,
} from "./helpers.mjs";

/**
 * (b) The scheduler running twice (or on several servers).
 *
 * The UNIQUE(list_id, occurrence_key) claim makes repeat runs no-ops: exactly one
 * order, exactly one charge, and duplicates are reported as skipped.
 */
test("scheduler running twice places exactly one order", async () => {
  await resetRecurringData();
  await hook("set-payment-outcome", { outcome: "success" });

  const product = await productByQuery("milk");
  await hook("set-stock", { productId: product.id, stock: 50 });

  const stamp = Date.now();
  const seeded = await seedList({
    email: `twice-${stamp}@example.com`,
    items: [{ productId: product.id, quantity: 1 }],
  });
  await hook("make-due", { listId: seeded.listId, nextRunAt: new Date(Date.now() - 120_000).toISOString() });

  const now = new Date().toISOString();
  const first = await runSchedulerFor([seeded.listId], now);
  const second = await runSchedulerFor([seeded.listId], now);
  const third = await runSchedulerFor([seeded.listId], now);

  assert(first.claimed === 1, `first run should claim 1, claimed ${first.claimed}`);
  assert(second.claimed === 0, `second run claimed ${second.claimed} — double processing`);
  assert(third.claimed === 0, `third run claimed ${third.claimed}`);

  const state = await listState(seeded.listId, seeded.headers);
  const withOrder = state.runs.filter((run) => run.orderNumber);
  assert(state.runs.length === 1, `expected 1 run row, got ${state.runs.length}`);
  assert(withOrder.length === 1, `expected 1 order, got ${withOrder.length}`);
});
