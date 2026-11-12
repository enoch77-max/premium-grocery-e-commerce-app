import { test } from "node:test";
import { assert, json } from "./http.mjs";

const headers = { "x-cart-token": `test-checkout-${Date.now()}` };

test("checkout rejects an incomplete payload", async () => {
  const products = await json("/api/search?q=bread");
  await json("/api/cart", {
    method: "POST",
    headers,
    body: JSON.stringify({ productId: products.body.products[0].id, quantity: 1 }),
  });
  const { status, body } = await json("/api/orders", {
    method: "POST",
    headers,
    body: JSON.stringify({ customerName: "A", email: "bad", address: "", city: "", postcode: "" }),
  });
  assert(status === 422, `expected 422, got ${status}`);
  assert(Object.keys(body.errors).length >= 3, "missing field errors");
});

test("valid checkout creates an order exactly once", async () => {
  const products = await json("/api/search?q=bread");
  await json("/api/cart", {
    method: "POST",
    headers,
    body: JSON.stringify({ productId: products.body.products[0].id, quantity: 1 }),
  });
  const payload = {
    customerName: "Test Shopper",
    email: `test-${Date.now()}@example.com`,
    address: "12 Test Street",
    city: "Brooklyn",
    postcode: "11215",
    deliverySlot: "today-18",
    paymentMethod: "cash",
    checkoutId: `test-${Date.now()}`,
  };
  const first = await json("/api/orders", { method: "POST", headers, body: JSON.stringify(payload) });
  assert(Boolean(first.body.orderNumber), "no order number returned");
  const replay = await json("/api/orders", { method: "POST", headers, body: JSON.stringify(payload) });
  assert(replay.body.orderNumber === first.body.orderNumber, "idempotency broken");
  assert(replay.body.alreadyPlaced === true, "replay not flagged");
});
