import { test } from "node:test";
import {
  assert,
  hook,
  json,
  productByQuery,
  resetRecurringData,
  runSchedulerFor,
  seedList,
  listState,
} from "./helpers.mjs";

/**
 * (c) Payment failing after reservation.
 *
 * Reservation decrements stock; a decline must release it, create no order, notify
 * the customer, schedule a retry, and after three attempts auto-pause the list
 * while keeping it saved.
 */
test("decline releases reserved stock, notifies and schedules a retry", async () => {
  await resetRecurringData();
  await hook("set-payment-outcome", { outcome: "decline" });

  const product = await productByQuery("sourdough");
  await hook("set-stock", { productId: product.id, stock: 7 });

  const stamp = Date.now();
  const seeded = await seedList({
    email: `decline-${stamp}@example.com`,
    items: [{ productId: product.id, quantity: 2 }],
  });
  await hook("make-due", { listId: seeded.listId });
  await runSchedulerFor([seeded.listId]);

  const afterFirst = await listState(seeded.listId, seeded.headers);
  const run = afterFirst.runs[0];
  assert(run, "no run created");
  assert(run.state === "held", `expected held after decline, got ${run.state}`);
  assert(run.failureCode === "decline", `unexpected failure code ${run.failureCode}`);
  assert(!run.orderNumber, "an order was created despite the decline");
  assert(run.attemptCount === 1, `expected attemptCount 1, got ${run.attemptCount}`);
  assert(run.nextAttemptAt, "no retry was scheduled");

  const { body } = await json("/api/search?q=sourdough");
  const current = body.products.find((p) => p.id === product.id);
  assert(current.stock === 7, `expected stock restored to 7, got ${current.stock}`);

  const audit = afterFirst.events.find((event) => event.reason.includes("charge failed"));
  assert(audit, "no audit entry for the failed charge");
});

test("three failures auto-pause the list and keep it saved", async () => {
  await resetRecurringData();
  await hook("set-payment-outcome", { outcome: "decline" });

  const product = await productByQuery("croissant");
  await hook("set-stock", { productId: product.id, stock: 20 });

  const stamp = Date.now();
  const seeded = await seedList({
    email: `pause-${stamp}@example.com`,
    items: [{ productId: product.id, quantity: 1 }],
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await hook("make-due", { listId: seeded.listId });
    await runSchedulerFor([seeded.listId], new Date(Date.now() + attempt * 3600_000).toISOString());
    // Simulate the retry window elapsing.
    await hook("make-due", {
      listId: seeded.listId,
      nextRunAt: new Date(Date.now() - 60_000).toISOString(),
    });
    await runSchedulerFor(
      [seeded.listId],
      new Date(Date.now() + 26 * 3600_000 * (attempt + 1)).toISOString(),
    );
  }

  const state = await listState(seeded.listId, seeded.headers);
  assert(state.list.status === "paused", `expected paused, got ${state.list.status}`);
  assert(/payment_/.test(state.list.pausedReason ?? ""), `unexpected reason ${state.list.pausedReason}`);
  assert(state.items.length >= 1, "list items were deleted — they must stay saved");
});
