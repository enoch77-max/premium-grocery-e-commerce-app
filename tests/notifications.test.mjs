import { test } from "node:test";
import { assert, json } from "./http.mjs";
import { hook } from "./recurring/helpers.mjs";

const PARAMS = {
  name: "Saraswathibehanthirumugam", // deliberately long first name
  link: "https://shop.example/account/recurring/123456789",
  item: "Wild Yeast Sourdough (800g wholegrain loaf)",
  list: "My weekly shop with the extra long name",
  when: "Tomorrow",
  amount: "$123.45",
};

const EVENTS = [
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

/** Templates must stay inside WhatsApp's template limit even with long params. */
test("every WhatsApp body renders under 300 characters", async () => {
  const { body } = await json(`/api/recurring/test?action=template-lengths&params=${encodeURIComponent(JSON.stringify(PARAMS))}`);
  if (body?.results) {
    for (const row of body.results) {
      assert(row.length <= 300, `${row.event} rendered ${row.length} chars`);
      assert(row.withinLimit === true, `${row.event} flagged over limit`);
    }
    assert(body.results.length === 10, `expected 10 templates, got ${body.results.length}`);
    return;
  }
  // Fallback: compute locally if the hook is unavailable.
  const mod = await import("../src/features/notifications/templates.ts").catch(() => null);
  assert(mod, "templates module unavailable and hook missing");
  for (const event of EVENTS) {
    const { body: rendered, withinLimit } = mod.renderWhatsapp(event, PARAMS, "en");
    assert(withinLimit, `${event} over 300 chars (${rendered.length})`);
  }
});

/** With no transport configured, dispatch must fail honestly, not fake a send. */
test("dispatch without transport records failure and never claims sent", async () => {
  await hook("reset-data");
  // create a list so a notification row exists
  const register = await json("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Notify Test", email: `notify-${Date.now()}@example.com`, password: "NotifyPass123" }),
  });
  const headers = { "x-session-token": register.body.token };
  const method = await json("/api/recurring/payment-methods", {
    method: "POST",
    headers,
    body: JSON.stringify({ gatewayCustomerToken: `cus_n${Date.now()}`, gatewayPaymentMethodToken: `pm_n${Date.now()}` }),
  });
  const search = await json("/api/search?q=milk");
  const created = await json("/api/recurring/lists", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Notify list",
      cadence: "daily",
      localTime: "08:00",
      timezone: "UTC",
      paymentMethodId: method.body.id,
      consent: true,
      items: [{ productId: search.body.products[0].id, quantity: 1 }],
    }),
  });
  assert(created.status === 200, `list create failed ${created.status}`);

  const skip = await json(`/api/recurring/lists/${created.body.list.id}/skip`, { method: "POST", headers });
  assert(skip.status === 200, `skip failed ${skip.status}`);

  // Dispatch is asynchronous by design (it must never block fulfilment), so poll
  // briefly for the row to reach a terminal state instead of racing it.
  let row = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const outbox = await hook("outbox");
    row = outbox.rows.find((entry) => entry.type === "run.skipped");
    if (row && row.status !== "pending") break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert(row, "no outbox row for skip");
  assert(row.status === "failed", `expected failed without transport, got ${row.status}`);
  assert(row.failureCode === "no_transport", `unexpected code ${row.failureCode}`);
});

/** A 24h reminder is emitted for a due list, once per occurrence. */
test("reminder emitted once per occurrence within lead window", async () => {
  await hook("reset-data");
  const register = await json("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Remind Test", email: `remind-${Date.now()}@example.com`, password: "RemindPass123" }),
  });
  const headers = { "x-session-token": register.body.token };
  const method = await json("/api/recurring/payment-methods", {
    method: "POST",
    headers,
    body: JSON.stringify({ gatewayCustomerToken: `cus_r${Date.now()}`, gatewayPaymentMethodToken: `pm_r${Date.now()}` }),
  });
  const search = await json("/api/search?q=milk");
  const created = await json("/api/recurring/lists", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Remind list",
      cadence: "daily",
      localTime: "08:00",
      timezone: "UTC",
      paymentMethodId: method.body.id,
      consent: true,
      items: [{ productId: search.body.products[0].id, quantity: 1 }],
    }),
  });
  await hook("make-due", { listId: created.body.list.id, nextRunAt: new Date(Date.now() + 3600_000).toISOString() });
  await hook("run-scheduler", { mode: "reminders-only" });
  await hook("run-scheduler", { mode: "reminders-only" });

  const outbox = await hook("outbox");
  const reminders = outbox.rows.filter((entry) => entry.type === "run.reminder" && entry.listId === created.body.list.id);
  assert(reminders.length === 1, `expected exactly one reminder, got ${reminders.length}`);
});
