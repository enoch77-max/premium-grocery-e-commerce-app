import { test } from "node:test";
import { assert, json, signIn } from "./http.mjs";

const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

test("owner can read the dashboard and settings", async (t) => {
  if (!EMAIL || !PASSWORD) return t.skip("ADMIN_EMAIL/ADMIN_PASSWORD not set");
  const { token } = await signIn(EMAIL, PASSWORD);
  const overview = await json("/api/admin/overview", { headers: { "x-session-token": token } });
  assert(overview.status === 200 && overview.body.ok, "overview failed");
  const settings = await json("/api/admin/settings", { headers: { "x-session-token": token } });
  assert(typeof settings.body.data.settings.storeOpen === "boolean", "settings malformed");
});

test("order status transitions stay in the shared vocabulary", async (t) => {
  if (!EMAIL || !PASSWORD) return t.skip("credentials not set");
  const { token } = await signIn(EMAIL, PASSWORD);
  const { body } = await json("/api/admin/orders", { headers: { "x-session-token": token } });
  const flow = ["confirmed", "packing", "on_the_way", "delivered"];
  assert(JSON.stringify(body.data.flow) === JSON.stringify(flow), `flow ${JSON.stringify(body.data.flow)}`);
  for (const order of body.data.orders) {
    assert(flow.includes(order.status) || order.status === "cancelled", `unknown status ${order.status}`);
  }
});
