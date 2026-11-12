/**
 * Recurring-order test helpers.
 *
 * Tests talk to the running app with RECURRING_TEST_HOOKS=1, which swaps in a
 * deterministic payment provider. That is a test double for the gateway only —
 * the stock, scheduler and state-machine code under test is the real code.
 */
import { BASE, assert, json } from "../http.mjs";

export async function hook(action, payload = {}) {
  const { status, body } = await json("/api/recurring/test", {
    method: "POST",
    body: JSON.stringify({ action, ...payload }),
  });
  if (status !== 200) throw new Error(`test hook ${action} failed: ${status} ${JSON.stringify(body)}`);
  return body;
}

/** Creates an account, a saved (token-only) payment method and a recurring list. */
export async function seedList({
  email,
  items,
  cadence = "daily",
  localTime = "09:00",
  timezone = "UTC",
  shortagePolicy = "partial",
}) {
  const register = await json("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Recurring Test", email, password: "RecurringPass123" }),
  });
  if (register.status !== 200)
    throw new Error(`register failed: ${register.status} ${JSON.stringify(register.body)}`);
  const token = register.body.token;
  const headers = { "x-session-token": token };

  const method = await json("/api/recurring/payment-methods", {
    method: "POST",
    headers,
    body: JSON.stringify({
      gateway: "stripe",
      gatewayCustomerToken: `cus_test_${Math.random().toString(36).slice(2, 12)}`,
      gatewayPaymentMethodToken: `pm_test_${Math.random().toString(36).slice(2, 12)}`,
      brand: "visa",
      last4: "4242",
    }),
  });
  if (method.status !== 200) throw new Error(`payment method failed: ${JSON.stringify(method.body)}`);

  const list = await json("/api/recurring/lists", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Weekly staples",
      cadence,
      localTime,
      timezone,
      shortagePolicy,
      paymentMethodId: method.body.id,
      consent: true,
      items,
    }),
  });
  if (list.status !== 200) throw new Error(`list create failed: ${list.status} ${JSON.stringify(list.body)}`);

  return { token, headers, listId: list.body.list.id, methodId: method.body.id };
}

/** Clears recurring state so each test file starts from a known-empty store. */
export async function resetRecurringData() {
  await hook("reset-data");
}

export async function runSchedulerFor(listIds, now = new Date().toISOString()) {
  const { result } = await hook("run-scheduler", { listIds, now });
  return result;
}

export async function productByQuery(query) {
  const { body } = await json(`/api/search?q=${encodeURIComponent(query)}`);
  if (!body.products?.length) throw new Error(`no product for ${query}`);
  return body.products[0];
}

export async function listState(listId, headers) {
  const { body } = await json(`/api/recurring/lists/${listId}`, { headers });
  return body;
}

export { BASE, assert, json };
