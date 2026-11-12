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

/** Pause/resume/skip/delay: the list must always stay saved. */
test("pause keeps the list saved, resume re-arms the schedule", async () => {
  await resetRecurringData();
  await hook("set-payment-outcome", { outcome: "success" });
  const product = await productByQuery("milk");
  await hook("set-stock", { productId: product.id, stock: 40 });

  const stamp = Date.now();
  const seeded = await seedList({
    email: `pause-resume-${stamp}@example.com`,
    items: [{ productId: product.id, quantity: 1 }],
  });

  const paused = await json(`/api/recurring/lists/${seeded.listId}`, {
    method: "PATCH",
    headers: seeded.headers,
    body: JSON.stringify({ action: "pause", reason: "travelling" }),
  });
  assert(paused.body.list.status === "paused", "list did not pause");

  await hook("make-due", { listId: seeded.listId });
  const whilePaused = await runSchedulerFor([seeded.listId]);
  assert(whilePaused.claimed === 0, "a paused list was processed");

  const resumed = await json(`/api/recurring/lists/${seeded.listId}`, {
    method: "PATCH",
    headers: seeded.headers,
    body: JSON.stringify({ action: "resume" }),
  });
  assert(resumed.body.list.status === "active", "list did not resume");

  const state = await listState(seeded.listId, seeded.headers);
  assert(state.items.length === 1, "items were lost while paused");
  assert(state.list.nextRunAt, "resume did not re-arm nextRunAt");
});

test("skip cancels exactly one occurrence and counts it", async () => {
  await resetRecurringData();
  await hook("set-payment-outcome", { outcome: "success" });
  const product = await productByQuery("milk");
  await hook("set-stock", { productId: product.id, stock: 40 });

  const stamp = Date.now();
  const seeded = await seedList({
    email: `skip-next-${stamp}@example.com`,
    items: [{ productId: product.id, quantity: 1 }],
  });

  const skip = await json(`/api/recurring/lists/${seeded.listId}/skip`, {
    method: "POST",
    headers: seeded.headers,
  });
  assert(skip.status === 200, "skip failed");

  await hook("make-due", { listId: seeded.listId });
  await runSchedulerFor([seeded.listId]);

  const state = await listState(seeded.listId, seeded.headers);
  assert(state.list.status === "active", "skip should not pause the list");
  assert(state.list.skipCount === 1, `expected skipCount 1, got ${state.list.skipCount}`);
  assert(state.runs[0].state === "cancelled", `expected cancelled, got ${state.runs[0].state}`);
  assert(!state.runs[0].orderNumber, "a skipped occurrence produced an order");
});

test("delay moves the next run and rejects past dates", async () => {
  await resetRecurringData();
  await hook("set-payment-outcome", { outcome: "success" });
  const product = await productByQuery("milk");
  await hook("set-stock", { productId: product.id, stock: 40 });

  const stamp = Date.now();
  const seeded = await seedList({
    email: `delay-${stamp}@example.com`,
    items: [{ productId: product.id, quantity: 1 }],
  });

  const past = await json(`/api/recurring/lists/${seeded.listId}/delay`, {
    method: "POST",
    headers: seeded.headers,
    body: JSON.stringify({ until: new Date(Date.now() - 3600_000).toISOString() }),
  });
  assert(past.status === 422, `past date should be rejected, got ${past.status}`);

  const until = new Date(Date.now() + 5 * 24 * 3600_000).toISOString();
  const delayed = await json(`/api/recurring/lists/${seeded.listId}/delay`, {
    method: "POST",
    headers: seeded.headers,
    body: JSON.stringify({ until }),
  });
  assert(delayed.status === 200, "delay failed");
  assert(delayed.body.list.nextRunAt.startsWith(until.slice(0, 16)), "nextRunAt not moved");
});

test("a list cannot be created without recorded consent", async () => {
  await resetRecurringData();
  const product = await productByQuery("milk");
  const register = await json("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "No Consent",
      email: `noconsent-${Date.now()}@example.com`,
      password: "ConsentPass123",
    }),
  });
  const method = await json("/api/recurring/payment-methods", {
    method: "POST",
    headers: { "x-session-token": register.body.token },
    body: JSON.stringify({
      gatewayCustomerToken: `cus_x${Date.now()}`,
      gatewayPaymentMethodToken: `pm_x${Date.now()}`,
      last4: "4242",
    }),
  });
  const attempt = await json("/api/recurring/lists", {
    method: "POST",
    headers: { "x-session-token": register.body.token },
    body: JSON.stringify({
      name: "No consent",
      cadence: "weekly",
      localTime: "08:00",
      timezone: "Europe/London",
      paymentMethodId: method.body.id,
      consent: false,
      items: [{ productId: product.id, quantity: 1 }],
    }),
  });
  assert(attempt.status === 422, `expected 422, got ${attempt.status}`);
  assert(attempt.body.errors?.consent, "no consent error returned");
});

test("raw card numbers are rejected as payment tokens", async () => {
  await resetRecurringData();
  const register = await json("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Pan Test",
      email: `pan-${Date.now()}@example.com`,
      password: "PanPass12345",
    }),
  });
  const attempt = await json("/api/recurring/payment-methods", {
    method: "POST",
    headers: { "x-session-token": register.body.token },
    body: JSON.stringify({
      gatewayCustomerToken: "cus_abc123",
      gatewayPaymentMethodToken: "4242 4242 4242 4242",
    }),
  });
  assert(attempt.status === 422, `expected 422 for a PAN, got ${attempt.status}`);
});
