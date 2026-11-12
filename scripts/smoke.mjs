/**
 * Post-deploy smoke test. Fails loudly if the shop cannot take an order.
 *   BASE_URL=https://your-domain.example node scripts/smoke.mjs
 */
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push(`✓ ${name}`);
  } catch (error) {
    results.push(`✗ ${name}: ${error.message}`);
  }
}

const json = async (path, init) => {
  const response = await fetch(base + path, init);
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

await check("health is ok", async () => {
  const { response, body } = await json("/api/health");
  if (!response.ok || !body.ok) throw new Error(`status ${response.status}`);
});

await check("readiness is ok", async () => {
  const { response, body } = await json("/api/ready");
  if (!response.ok || !body.ok) throw new Error(JSON.stringify(body.checks ?? {}));
});

await check("security headers present", async () => {
  const response = await fetch(base + "/");
  for (const header of [
    "x-content-type-options",
    "referrer-policy",
    "content-security-policy",
    "permissions-policy",
  ]) {
    if (!response.headers.get(header)) throw new Error(`missing ${header}`);
  }
});

await check("framing policy is explicit", async () => {
  const csp = (await fetch(base + "/")).headers.get("content-security-policy") ?? "";
  const ancestors = /frame-ancestors ([^;]+)/.exec(csp)?.[1]?.trim();
  if (!ancestors) throw new Error("missing frame-ancestors directive");
});

await check("home renders products", async () => {
  const html = await (await fetch(base + "/")).text();
  if (!html.includes("/product/")) throw new Error("no product links");
});

await check("admin API rejects anonymous access", async () => {
  const { response } = await json("/api/admin/overview");
  if (response.status !== 401 && response.status !== 403)
    throw new Error(`expected 401/403, got ${response.status}`);
});

await check("catalogue search responds", async () => {
  const { response, body } = await json("/api/search?q=milk");
  if (!response.ok || !Array.isArray(body.products)) throw new Error(`status ${response.status}`);
});

await check("account pages render", async () => {
  for (const path of ["/login", "/login?mode=create", "/forgot-password", "/reset-password", "/checkout"]) {
    const response = await fetch(base + path);
    if (!response.ok) throw new Error(`${path} status ${response.status}`);
  }
});

await check("forgot-password cannot enumerate accounts", async () => {
  const missing = await json("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `nobody-${Date.now()}@example.com` }),
  });
  if (missing.response.status !== 200) throw new Error(`status ${missing.response.status}`);
  if (missing.body.link) throw new Error("a reset link was issued for an unknown email");
});

await check("configured credentials sign in", async () => {
  const demoEmail = process.env.DEMO_EMAIL;
  const demoPassword = process.env.DEMO_PASSWORD;
  if (!demoEmail || !demoPassword) {
    console.log("     (skipped — DEMO_EMAIL/DEMO_PASSWORD not set)");
    return;
  }
  const { response, body } = await json("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: demoEmail, password: demoPassword }),
  });
  if (!response.ok || !body.token) throw new Error(`demo login ${response.status} ${body.error ?? ""}`);
  if (body.user?.email !== demoEmail.toLowerCase()) throw new Error(`signed in as ${body.user?.email}`);
  const me = await json("/api/auth/me", { headers: { "x-session-token": body.token } });
  if (!me.body.user) throw new Error("session did not resolve");
  const account = await json("/api/account/orders", { headers: { "x-session-token": body.token } });
  if (!Array.isArray(account.body.orders)) throw new Error("account orders unavailable");
});

await check("demo sign-in uses configured identity", async () => {
  const { response, body } = await json("/api/auth/demo", { method: "POST" });
  if (!response.ok || !body.token) throw new Error(`status ${response.status} ${body.error ?? ""}`);
  const expected = process.env.DEMO_EMAIL?.toLowerCase();
  if (expected && body.user?.email !== expected) {
    throw new Error(`demo endpoint signed in as ${body.user?.email}, expected ${expected}`);
  }
});

await check("session survives without local storage", async () => {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) return;
  const response = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  const cookie = (response.headers.getSetCookie?.() ?? []).find((c) => c.startsWith("fresco_session="));
  if (!cookie) throw new Error("login did not set a session cookie");
  // Cookie-only request: this is the path a browser with blocked storage relies on.
  const me = await fetch(base + "/api/auth/me", { headers: { cookie: cookie.split(";")[0] } });
  const meBody = await me.json();
  if (meBody.user?.email !== body.user.email) throw new Error("cookie-only session did not resolve");
});

await check("owner credentials open the dashboard", async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("     (skipped — ADMIN_EMAIL/ADMIN_PASSWORD not set)");
    return;
  }
  const { response, body } = await json("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok || !body.token) throw new Error(`admin login ${response.status} ${body.error ?? ""}`);
  if (body.user?.role !== "admin") throw new Error(`role ${body.user?.role}`);
  const overview = await json("/api/admin/overview", { headers: { "x-session-token": body.token } });
  if (!overview.body.ok) throw new Error("dashboard API rejected the owner");
});

await check("typo search stays on-topic", async () => {
  const { response, body } = await json(`/api/search?q=${encodeURIComponent("breat")}`);
  if (!response.ok) throw new Error(`status ${response.status}`);
  const names = (body.products ?? []).map((product) => product.name.toLowerCase());
  if (names.some((name) => name.includes("coffee"))) {
    throw new Error(`typo "breat" returned coffee: ${names.join(", ")}`);
  }
  if (!body.intent?.corrected) throw new Error("no did-you-mean correction offered");
  const exact = await json(`/api/search?q=${encodeURIComponent("coffee")}`);
  const first = exact.body.products?.[0]?.name ?? "";
  if (!/coffee/i.test(first)) throw new Error(`exact "coffee" ranked "${first}" first`);
});

await check("sitemap and robots served", async () => {
  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    const response = await fetch(base + path);
    if (!response.ok) throw new Error(`${path} status ${response.status}`);
  }
});

console.log(results.join("\n"));
if (results.some((line) => line.startsWith("✗"))) process.exit(1);
console.log("\nAll smoke checks passed.");
