import { test } from "node:test";
import { assert, json } from "./http.mjs";

const token = `test-cart-${Date.now()}`;
const headers = { "x-cart-token": token };

test("empty cart is well formed", async () => {
  const { status, body } = await json("/api/cart", { headers });
  assert(status === 200, `status ${status}`);
  assert(body.cart.itemCount === 0, "expected empty cart");
  assert(typeof body.cart.freeDeliveryThresholdCents === "number", "missing threshold");
});

test("adding a product updates totals", async () => {
  const products = await json("/api/search?q=milk");
  const product = products.body.products[0];
  const { body } = await json("/api/cart", {
    method: "POST",
    headers,
    body: JSON.stringify({ productId: product.id, quantity: 2 }),
  });
  assert(body.cart.itemCount === 2, `itemCount ${body.cart.itemCount}`);
  assert(body.cart.subtotalCents === product.priceCents * 2, "subtotal mismatch");
});

test("quantity updates and removals work", async () => {
  const products = await json("/api/search?q=milk");
  const product = products.body.products[0];
  const updated = await json("/api/cart", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ productId: product.id, quantity: 3 }),
  });
  assert(updated.body.cart.itemCount === 3, `itemCount ${updated.body.cart.itemCount}`);
  const removed = await json(`/api/cart?productId=${product.id}`, { method: "DELETE", headers });
  assert(removed.body.cart.itemCount === 0, "product not removed");
});

test("invalid coupon is reported, not applied", async () => {
  const { body } = await json("/api/cart/coupon", {
    method: "POST",
    headers,
    body: JSON.stringify({ code: "NOTAREALCODE" }),
  });
  assert(body.cart.coupon === null, "invalid coupon applied");
});
