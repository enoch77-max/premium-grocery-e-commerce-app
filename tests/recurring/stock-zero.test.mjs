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
 * (d) Stock hitting zero just before the run, under each shortage policy.
 */
test("partial policy bills only for what is delivered", async () => {
  await resetRecurringData();
  await hook("set-payment-outcome", { outcome: "success" });
  const short = await productByQuery("strawberries");
  const full = await productByQuery("milk");
  await hook("set-stock", { productId: short.id, stock: 0 });
  await hook("set-stock", { productId: full.id, stock: 30 });

  const stamp = Date.now();
  const seeded = await seedList({
    email: `partial-${stamp}@example.com`,
    shortagePolicy: "partial",
    items: [
      { productId: short.id, quantity: 2 },
      { productId: full.id, quantity: 1 },
    ],
  });
  await hook("make-due", { listId: seeded.listId });
  await runSchedulerFor([seeded.listId]);

  const state = await listState(seeded.listId, seeded.headers);
  const run = state.runs[0];
  assert(run.state === "partially_fulfilled", `expected partially_fulfilled, got ${run.state}`);
  assert(run.amountCents > 0, "nothing was billed for the deliverable item");

  const { body } = await json("/api/search?q=milk");
  const milk = body.products.find((p) => p.id === full.id);
  assert(milk.stock === 29, `delivered item not decremented: stock ${milk.stock}`);
});

test("hold policy charges nothing when anything is short", async () => {
  await resetRecurringData();
  await hook("set-payment-outcome", { outcome: "success" });
  const gone = await productByQuery("spinach");
  await hook("set-stock", { productId: gone.id, stock: 0 });

  const stamp = Date.now();
  const seeded = await seedList({
    email: `hold-${stamp}@example.com`,
    shortagePolicy: "hold",
    items: [{ productId: gone.id, quantity: 1 }],
  });
  await hook("make-due", { listId: seeded.listId });
  await runSchedulerFor([seeded.listId]);

  const state = await listState(seeded.listId, seeded.headers);
  const run = state.runs[0];
  assert(run.state === "held", `expected held, got ${run.state}`);
  assert(!run.orderNumber, "an order was created for a held run");
  assert(run.amountCents === 0, `unexpected amount ${run.amountCents}`);
});

test("skip_item policy drops the missing line and fulfils the rest", async () => {
  await resetRecurringData();
  await hook("set-payment-outcome", { outcome: "success" });
  const gone = await productByQuery("avocado");
  const kept = await productByQuery("banana");
  await hook("set-stock", { productId: gone.id, stock: 0 });
  await hook("set-stock", { productId: kept.id, stock: 15 });

  const stamp = Date.now();
  const seeded = await seedList({
    email: `skip-${stamp}@example.com`,
    shortagePolicy: "skip_item",
    items: [
      { productId: gone.id, quantity: 3 },
      { productId: kept.id, quantity: 2 },
    ],
  });
  await hook("make-due", { listId: seeded.listId });
  await runSchedulerFor([seeded.listId]);

  const state = await listState(seeded.listId, seeded.headers);
  const run = state.runs[0];
  assert(
    run.state === "confirmed" || run.state === "partially_fulfilled",
    `expected fulfilment, got ${run.state}`,
  );
  assert(run.amountCents > 0, "the kept line was not billed");
});
