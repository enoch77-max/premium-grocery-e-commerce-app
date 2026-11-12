import { test } from "node:test";
import { assert, json } from "./http.mjs";
import { hook } from "./recurring/helpers.mjs";

async function signInAs(email, password) {
  const register = await json("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: email.split("@")[0], email, password }),
  });
  if (register.status !== 200) throw new Error(`register ${email} failed ${register.status}`);
  return { headers: { "x-session-token": register.body.token } };
}

/** Role matrix: who can see and do what in the recurring console. */
test("roles gate the recurring console correctly", async () => {
  await hook("reset-data");
  const stamp = Date.now();
  const seller = await signInAs(`seller-${stamp}@example.com`, "SellerPass123");
  const stock = await signInAs(`stock-${stamp}@example.com`, "StockPass123");
  await hook("set-role", { email: `seller-${stamp}@example.com`, role: "seller" });
  await hook("set-role", { email: `stock-${stamp}@example.com`, role: "stock_manager" });

  const sellerDemand = await json("/api/admin/recurring/demand", { headers: seller.headers });
  assert(sellerDemand.status === 200, `seller demand should be 200, got ${sellerDemand.status}`);

  const sellerSettings = await json("/api/admin/recurring/settings", { headers: seller.headers });
  assert(sellerSettings.status === 403, `seller settings should be 403, got ${sellerSettings.status}`);

  const stockSettings = await json("/api/admin/recurring/settings", { headers: stock.headers });
  assert(stockSettings.status === 403, `stock_manager settings should be 403, got ${stockSettings.status}`);

  const stockAllocate = await json("/api/admin/recurring/allocation", { headers: stock.headers });
  assert(stockAllocate.status === 200, `stock_manager allocation should be 200, got ${stockAllocate.status}`);

  const sellerAudit = await json("/api/admin/recurring/audit", { headers: seller.headers });
  assert(sellerAudit.status === 403, `seller audit should be 403, got ${sellerAudit.status}`);

  const anon = await json("/api/admin/recurring/demand");
  assert(anon.status === 401, `anonymous demand should be 401, got ${anon.status}`);
});

/** Settings validate the 1–3 day lead window and require at least one role. */
test("shortage lead time validates 1–3 days", async () => {
  await hook("reset-data");
  const stamp = Date.now();
  const admin = await signInAs(`adminset-${stamp}@example.com`, "AdminSetPass1");
  await hook("set-role", { email: `adminset-${stamp}@example.com`, role: "admin" });

  const bad = await json("/api/admin/recurring/settings", {
    method: "PATCH",
    headers: admin.headers,
    body: JSON.stringify({ shortageLeadDays: 5 }),
  });
  assert(bad.status === 400, `5 days should be rejected, got ${bad.status}`);

  const noRoles = await json("/api/admin/recurring/settings", {
    method: "PATCH",
    headers: admin.headers,
    body: JSON.stringify({ alertRoles: [] }),
  });
  assert(noRoles.status === 400, `empty roles should be rejected, got ${noRoles.status}`);

  const good = await json("/api/admin/recurring/settings", {
    method: "PATCH",
    headers: admin.headers,
    body: JSON.stringify({ shortageLeadDays: 2, alertRoles: ["stock_manager"] }),
  });
  assert(good.status === 200, `valid save failed ${good.status} ${JSON.stringify(good.body)}`);
  assert(good.body.data.shortageLeadDays === 2, "lead days not saved");
});

/** Demand forecast counts scheduled occurrences against stock, shortages first. */
test("demand forecast surfaces shortfall worst-first", async () => {
  await hook("reset-data");
  const stamp = Date.now();
  const customer = await signInAs(`demand-${stamp}@example.com`, "DemandPass123");
  const method = await json("/api/recurring/payment-methods", {
    method: "POST",
    headers: customer.headers,
    body: JSON.stringify({ gatewayCustomerToken: `cus_d${stamp}`, gatewayPaymentMethodToken: `pm_d${stamp}` }),
  });
  const scarce = await json("/api/search?q=strawberries");
  const abundant = await json("/api/search?q=milk");
  const scarceId = scarce.body.products[0].id;
  const abundantId = abundant.body.products[0].id;
  await hook("set-stock", { productId: scarceId, stock: 2 });
  await hook("set-stock", { productId: abundantId, stock: 500 });

  await json("/api/recurring/lists", {
    method: "POST",
    headers: customer.headers,
    body: JSON.stringify({
      name: "Demand list",
      cadence: "daily",
      localTime: "07:00",
      timezone: "UTC",
      paymentMethodId: method.body.id,
      consent: true,
      items: [
        { productId: scarceId, quantity: 3 },
        { productId: abundantId, quantity: 1 },
      ],
    }),
  });

  const admin = await signInAs(`demandadmin-${stamp}@example.com`, "DemandAdmin1");
  await hook("set-role", { email: `demandadmin-${stamp}@example.com`, role: "admin" });
  const demand = await json("/api/admin/recurring/demand?days=7", { headers: admin.headers });
  assert(demand.status === 200, `demand failed ${demand.status}`);
  const rows = demand.body.data.rows;
  assert(rows.length >= 2, `expected rows, got ${rows.length}`);
  const scarceRow = rows.find((row) => row.productId === scarceId);
  assert(scarceRow, "scarce product missing from forecast");
  assert(scarceRow.demand >= 21, `daily demand over 7 days should be >=21, got ${scarceRow.demand}`);
  assert(scarceRow.shortfall === scarceRow.demand - 2, "shortfall math wrong");
  assert(rows[0].shortfall >= rows[rows.length - 1].shortfall, "not sorted worst-first");
});
