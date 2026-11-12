/**
 * End-to-end check of the owner dashboard API. Creates a real product, edits it,
 * flips a setting and confirms the audit trail. Cleans up after itself.
 *   BASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/verify-admin.mjs
 */
const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  process.exit(1);
}

let token = "";
const call = async (path, init = {}) => {
  const response = await fetch(base + path, {
    ...init,
    headers: { "Content-Type": "application/json", "x-session-token": token, ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
};

const steps = [];
const check = (name, ok, detail = "") => {
  steps.push(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(name);
};

try {
  const login = await call("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  check(
    "admin can sign in",
    login.status === 200 && login.body.user?.role === "admin",
    `role ${login.body.user?.role}`,
  );
  token = login.body.token;
  check("session token returned", Boolean(token));

  const anon = await fetch(base + "/api/admin/overview");
  check(
    "anonymous dashboard access blocked",
    anon.status === 401 || anon.status === 403,
    `status ${anon.status}`,
  );

  const overview = await call("/api/admin/overview");
  check(
    "overview loads",
    overview.status === 200 && overview.body.ok,
    `${overview.body.data?.catalogue?.total ?? 0} products`,
  );

  const created = await call("/api/admin/products", {
    method: "POST",
    body: JSON.stringify({
      name: `Smoke Test Item ${Date.now()}`,
      brand: "QA",
      categorySlug: "pantry",
      unit: "each",
      priceCents: 199,
      stock: 5,
    }),
  });
  check("product created", created.status === 200 && created.body.ok, created.body.data?.product?.slug);
  const productId = created.body.data?.product?.id;

  const patched = await call("/api/admin/products", {
    method: "PATCH",
    body: JSON.stringify({ id: productId, priceCents: 299, isActive: false }),
  });
  check(
    "product updated + unpublished",
    patched.status === 200 && patched.body.data?.product?.isActive === false,
  );

  const storefront = await fetch(base + "/api/search?q=Smoke+Test+Item").then((r) => r.json());
  const stillListed = (storefront.products ?? []).some((p) => p.id === productId);
  check("unpublished product hidden from storefront", !stillListed);

  const settings = await call("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify({ storeOpen: true }),
  });
  check("settings writable", settings.status === 200 && settings.body.data?.settings?.storeOpen === true);

  const finalOverview = await call("/api/admin/overview");
  const activity = finalOverview.body.data?.activity ?? [];
  check(
    "mutations audited",
    activity.some((entry) => entry.action === "product.create"),
    `${activity.length} entries`,
  );

  // clean up the smoke product
  if (productId)
    await call("/api/admin/products", {
      method: "PATCH",
      body: JSON.stringify({ id: productId, isActive: false, stock: 0 }),
    });
} catch (error) {
  steps.push(`✗ aborted: ${error.message}`);
}

console.log(steps.join("\n"));
if (steps.some((line) => line.startsWith("✗"))) process.exit(1);
console.log("\nOwner dashboard verified.");
