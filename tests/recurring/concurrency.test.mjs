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
 * (a) Two simultaneous buyers of the last item.
 *
 * Stock is 1. Two separate accounts each want it at the same moment. The atomic
 * conditional UPDATE must grant exactly one and return a clean held/out-of-stock
 * outcome to the other — never both, never negative stock.
 */
test("two simultaneous buyers of the last item: exactly one wins", async () => {
  await resetRecurringData();
  await hook("set-payment-outcome", { outcome: "success" });

  const product = await productByQuery("bananas");
  await hook("set-stock", { productId: product.id, stock: 1 });

  const stamp = Date.now();
  const [a, b] = await Promise.all([
    seedList({ email: `race-a-${stamp}@example.com`, items: [{ productId: product.id, quantity: 1 }] }),
    seedList({ email: `race-b-${stamp}@example.com`, items: [{ productId: product.id, quantity: 1 }] }),
  ]);

  await hook("make-due", { listId: a.listId });
  await hook("make-due", { listId: b.listId });

  const result = await runSchedulerFor([a.listId, b.listId]);
  assert(result.claimed >= 1, "scheduler claimed nothing");

  const stateA = await listState(a.listId, a.headers);
  const stateB = await listState(b.listId, b.headers);
  const states = [stateA.runs[0]?.state, stateB.runs[0]?.state];

  const fulfilled = states.filter((s) => s === "confirmed" || s === "partially_fulfilled").length;
  const notFulfilled = states.filter((s) => s !== "confirmed" && s !== "partially_fulfilled").length;
  assert(fulfilled === 1, `expected exactly one fulfilment, got ${JSON.stringify(states)}`);
  assert(notFulfilled === 1, `expected exactly one loser, got ${JSON.stringify(states)}`);

  const { body } = await json(`/api/search?q=bananas`);
  const after = body.products.find((p) => p.id === product.id);
  assert(after.stock === 0, `expected stock 0, got ${after.stock}`);
});
