/**
 * Fresco standalone backend — Express + PostgreSQL.
 *
 * This is a complete REST implementation of the store's data layer, runnable
 * without Next.js. It shares the same PostgreSQL database and schema as the
 * storefront (`db/schema.sql`), so the frontend (Next.js `/api/*`) and this
 * server are interchangeable clients of one source of truth.
 *
 *   node server/index.mjs          # http://localhost:4000
 *   PORT=4100 node server/index.mjs
 *
 * Endpoints (JSON):
 *   GET    /api/health
 *   GET    /api/products                    ?category=&q=
 *   GET    /api/products/:slug
 *   GET    /api/categories
 *   GET    /api/cart                        x-cart-token header or fresco_cart cookie
 *   POST   /api/cart                        { productId, quantity } | { items: [...] }
 *   PATCH  /api/cart                        { productId, quantity }
 *   DELETE /api/cart?productId=
 *   POST   /api/cart/coupon                 { code }
 *   POST   /api/orders                      { customer..., checkoutId }
 *   POST   /api/orders/track                { orderNumber, email }
 *   POST   /api/auth/demo                   -> demo session token
 *   GET    /api/account/orders               x-session-token
 */

import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const FREE_DELIVERY_THRESHOLD_CENTS = 3500;
const DELIVERY_FEE_CENTS = 399;
const MAX_QTY = 20;
const CART_COOKIE = "fresco_cart";
const SESSION_COOKIE = "fresco_session";

const DEMO = { email: "jordan@fresco.demo", password: "frescoodemo" };

const pool = new Pool({ connectionString: DATABASE_URL, max: 10 });
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "256kb" }));
app.use((req, _res, next) => {
  req.cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((pair) => pair.length === 2)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
  next();
});

const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const tx = (fn) => pool.connect().then(async (client) => {
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});

function cartTokens(req) {
  const header = (req.get("x-cart-token") || "").trim();
  const cookie = req.cookies[CART_COOKIE] || "";
  return [...new Set([header, cookie].filter(Boolean))];
}

async function cartByToken(token) {
  if (!token) return null;
  const { rows } = await pool.query("select * from carts where token = $1 limit 1", [token]);
  return rows[0] || null;
}

/** Returns the best cart for this browser (most units, then newest). */
async function pickCart(req) {
  const tokens = cartTokens(req);
  const scored = [];
  for (const token of tokens) {
    const cart = await cartByToken(token);
    if (!cart) {
      scored.push({ token, cart: null, units: 0, updated: 0 });
      continue;
    }
    const { rows } = await pool.query(
      "select coalesce(sum(quantity),0)::int as units from cart_items where cart_id = $1",
      [cart.id],
    );
    scored.push({ token, cart, units: rows[0].units, updated: new Date(cart.updated_at).getTime() });
  }
  scored.sort((a, b) => b.units - a.units || b.updated - a.updated);
  return scored[0] || null;
}

async function ensureCart(req) {
  const picked = await pickCart(req);
  if (picked?.cart) return picked.cart;
  const token = picked?.token || randomUUID();
  await pool.query("insert into carts (token) values ($1) on conflict (token) do nothing", [token]);
  return cartByToken(token);
}

async function buildCart(token) {
  const empty = {
    token: token || null,
    lines: [],
    itemCount: 0,
    subtotalCents: 0,
    savingsCents: 0,
    discountCents: 0,
    deliveryCents: 0,
    totalCents: 0,
    coupon: null,
    couponError: null,
    freeDeliveryRemainingCents: FREE_DELIVERY_THRESHOLD_CENTS,
  };
  const cart = await cartByToken(token);
  if (!cart) return empty;

  const { rows } = await pool.query(
    `select ci.id, ci.product_id, ci.quantity, p.slug, p.name, p.brand, p.unit, p.image_url,
            p.price_cents, p.compare_at_cents, p.stock, p.category_slug
       from cart_items ci join products p on p.id = ci.product_id
      where ci.cart_id = $1 order by ci.id`,
    [cart.id],
  );

  const lines = rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    unit: row.unit,
    imageUrl: row.image_url,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_cents,
    quantity: row.quantity,
    stock: row.stock,
    categorySlug: row.category_slug,
    lineTotalCents: row.price_cents * row.quantity,
    lineSavingsCents: row.compare_at_cents ? (row.compare_at_cents - row.price_cents) * row.quantity : 0,
  }));

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const savingsCents = lines.reduce((sum, line) => sum + line.lineSavingsCents, 0);
  const deliveryCents = subtotalCents === 0 || subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : DELIVERY_FEE_CENTS;

  let coupon = null;
  let couponError = null;
  let discountCents = 0;
  let effectiveDelivery = deliveryCents;

  if (cart.coupon_code) {
    const { rows: coupons } = await pool.query("select * from coupons where upper(code) = upper($1) and active limit 1", [
      cart.coupon_code,
    ]);
    const found = coupons[0];
    if (!found) {
      couponError = "That code is no longer available";
      await pool.query("update carts set coupon_code = null where id = $1", [cart.id]);
    } else if (subtotalCents < found.min_subtotal_cents) {
      couponError = `Add ${money(found.min_subtotal_cents - subtotalCents)} more to unlock ${found.code} — it's saved to your basket.`;
    } else if (found.kind === "delivery") {
      if (deliveryCents === 0) {
        couponError = `${found.code} is saved to your basket — delivery is already free on this order.`;
      } else {
        coupon = found;
        effectiveDelivery = 0;
      }
    } else if (found.kind === "percent") {
      coupon = found;
      discountCents = Math.floor((subtotalCents * found.percent_off) / 100);
    } else {
      coupon = found;
      discountCents = Math.min(found.value_cents, subtotalCents);
    }
  }

  return {
    token: cart.token,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents,
    savingsCents,
    discountCents,
    deliveryCents: effectiveDelivery,
    totalCents: Math.max(0, subtotalCents - discountCents + effectiveDelivery),
    coupon: coupon ? { code: coupon.code, description: coupon.description, discountCents } : null,
    couponError,
    freeDeliveryRemainingCents: Math.max(0, FREE_DELIVERY_THRESHOLD_CENTS - subtotalCents),
  };
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

async function sessionToken(req) {
  return req.get("x-session-token") || req.cookies[SESSION_COOKIE] || null;
}

async function currentUser(req) {
  const token = await sessionToken(req);
  if (!token) return null;
  const { rows } = await pool.query(
    `select u.id, u.email, u.name, u.phone from sessions s join users u on u.id = s.user_id
      where s.token = $1 and s.expires_at > now() limit 1`,
    [token],
  );
  return rows[0] || null;
}

async function ensureDemoAccount() {
  await pool.query(
    `insert into users (email, name, phone, password_hash)
     values ($1, 'Jordan Smith', '(555) 012-3456', $2)
     on conflict (email) do update set password_hash = excluded.password_hash
     returning id`,
    [DEMO.email, hashPassword(DEMO.password)],
  );
  const { rows } = await pool.query("select id from users where email = $1", [DEMO.email]);
  const userId = rows[0].id;
  const { rows: addr } = await pool.query("select count(*)::int as n from addresses where user_id = $1", [userId]);
  if (addr[0].n === 0) {
    await pool.query(
      `insert into addresses (user_id, label, recipient, line1, line2, city, postcode, phone, instructions, is_default)
       values ($1,'Home','Jordan Smith','402 7th Avenue','Apt 3B','Brooklyn','11215','(555) 012-3456','Buzzer 12, leave at the door',true),
              ($1,'Work','Jordan Smith','88 Orchard Street','Floor 4','Brooklyn','11211','(555) 012-3456','Reception desk',false)`,
      [userId],
    );
  }
  return userId;
}

/* ------------------------------- routes ------------------------------- */

app.get("/api/health", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "select (select count(*)::int from products) products, (select count(*)::int from orders) orders",
    );
    res.json({ ok: true, backend: "express", database: "postgres", ...rows[0] });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/categories", async (_req, res) => {
  const { rows } = await pool.query("select * from categories order by sort_order");
  res.json({ categories: rows });
});

app.get("/api/products", async (req, res) => {
  const { category, q } = req.query;
  const params = [];
  const where = [];
  if (category) {
    params.push(category);
    where.push(`category_slug = $${params.length}`);
  }
  if (q) {
    params.push(`%${String(q).toLowerCase()}%`);
    where.push(`lower(name) like $${params.length}`);
  }
  const { rows } = await pool.query(
    `select * from products ${where.length ? `where ${where.join(" and ")}` : ""} order by sort_order`,
    params,
  );
  res.json({ products: rows });
});

app.get("/api/products/:slug", async (req, res) => {
  const { rows } = await pool.query("select * from products where slug = $1", [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ error: "Product not found" });
  res.json({ product: rows[0] });
});

app.get("/api/cart", async (req, res) => {
  const picked = await pickCart(req);
  const cart = await buildCart(picked?.token);
  if (picked?.token) res.cookie?.(CART_COOKIE, picked.token);
  res.setHeader("Set-Cookie", `${CART_COOKIE}=${cart.token || ""}; Path=/; SameSite=Lax; Max-Age=5184000`);
  res.json({ cart, cartToken: cart.token });
});

app.post("/api/cart", async (req, res) => {
  const cart = await ensureCart(req);
  const items = Array.isArray(req.body?.items)
    ? req.body.items
    : [{ productId: req.body?.productId, quantity: req.body?.quantity ?? 1 }];

  for (const item of items) {
    const productId = Number(item.productId);
    if (!Number.isFinite(productId)) continue;
    const { rows } = await pool.query("select stock from products where id = $1", [productId]);
    if (!rows[0]) continue;
    const quantity = Math.max(1, Math.min(MAX_QTY, Number(item.quantity) || 1, rows[0].stock));
    await pool.query(
      `insert into cart_items (cart_id, product_id, quantity) values ($1,$2,$3)
       on conflict (cart_id, product_id) do update
         set quantity = least(cart_items.quantity + $3, ${MAX_QTY}, $4)`,
      [cart.id, productId, quantity, rows[0].stock],
    );
  }
  await pool.query("update carts set updated_at = now() where id = $1", [cart.id]);
  const state = await buildCart(cart.token);
  res.setHeader("Set-Cookie", `${CART_COOKIE}=${cart.token}; Path=/; SameSite=Lax; Max-Age=5184000`);
  res.json({ cart: state, cartToken: cart.token });
});

app.patch("/api/cart", async (req, res) => {
  const cart = await ensureCart(req);
  const productId = Number(req.body?.productId);
  const quantity = Number(req.body?.quantity);
  if (!Number.isFinite(productId) || !Number.isFinite(quantity)) {
    return res.status(400).json({ error: "productId and quantity are required" });
  }
  if (quantity <= 0) {
    await pool.query("delete from cart_items where cart_id = $1 and product_id = $2", [cart.id, productId]);
  } else {
    await pool.query("update cart_items set quantity = $3 where cart_id = $1 and product_id = $2", [
      cart.id,
      productId,
      Math.min(MAX_QTY, Math.round(quantity)),
    ]);
  }
  res.json({ cart: await buildCart(cart.token), cartToken: cart.token });
});

app.delete("/api/cart", async (req, res) => {
  const cart = await ensureCart(req);
  const productId = Number(req.query.productId);
  if (!Number.isFinite(productId)) return res.status(400).json({ error: "productId is required" });
  await pool.query("delete from cart_items where cart_id = $1 and product_id = $2", [cart.id, productId]);
  res.json({ cart: await buildCart(cart.token), cartToken: cart.token });
});

app.post("/api/cart/coupon", async (req, res) => {
  const cart = await ensureCart(req);
  const code = String(req.body?.code || "").trim().toUpperCase();
  const { rows } = await pool.query("select * from coupons where upper(code) = $1 and active limit 1", [code]);
  if (!rows[0]) return res.status(404).json({ error: "That code isn't valid — check the spelling and try again" });
  await pool.query("update carts set coupon_code = $2 where id = $1", [cart.id, rows[0].code]);
  res.json({ cart: await buildCart(cart.token), cartToken: cart.token });
});

app.delete("/api/cart/coupon", async (req, res) => {
  const cart = await ensureCart(req);
  await pool.query("update carts set coupon_code = null where id = $1", [cart.id]);
  res.json({ cart: await buildCart(cart.token), cartToken: cart.token });
});

app.post("/api/orders", async (req, res) => {
  const checkoutId = typeof req.body?.checkoutId === "string" && req.body.checkoutId.length >= 8 ? req.body.checkoutId : null;
  if (checkoutId) {
    const { rows } = await pool.query("select order_number, total_cents from orders where checkout_id = $1", [checkoutId]);
    if (rows[0]) return res.json({ orderNumber: rows[0].order_number, totalCents: rows[0].total_cents, alreadyPlaced: true });
  }

  const picked = await pickCart(req);
  const cart = await buildCart(picked?.token);
  if (!picked?.token || !cart.lines.length) {
    return res.status(409).json({ error: "This basket was already checked out.", code: "EMPTY_BASKET", cart });
  }

  const errors = {};
  if (String(req.body?.customerName || "").trim().length < 2) errors.customerName = "Please tell us your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(req.body?.email || ""))) errors.email = "Enter a valid email";
  if (String(req.body?.address || "").trim().length < 4) errors.address = "Add a street address";
  if (String(req.body?.city || "").trim().length < 2) errors.city = "Add a city";
  if (String(req.body?.postcode || "").trim().length < 3) errors.postcode = "Add a postcode";
  if (Object.keys(errors).length) return res.status(422).json({ error: "Please complete the highlighted fields", errors });

  const user = await currentUser(req);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const orderNumber = `FR-${Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join("")}`;

  const created = await tx(async (client) => {
    const { rows } = await client.query(
      `insert into orders (order_number, checkout_id, user_id, customer_name, email, phone, address, city, postcode,
                           delivery_slot, payment_method, notes, subtotal_cents, savings_cents, delivery_cents,
                           discount_cents, total_cents, coupon_code, item_count, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'confirmed')
       returning id`,
      [
        orderNumber,
        checkoutId,
        user?.id ?? null,
        String(req.body.customerName).trim(),
        String(req.body.email).trim(),
        String(req.body.phone || "").trim(),
        String(req.body.address).trim(),
        String(req.body.city).trim(),
        String(req.body.postcode).trim(),
        String(req.body.deliverySlot || "today-18"),
        String(req.body.paymentMethod || "card"),
        String(req.body.notes || "").trim(),
        cart.subtotalCents,
        cart.savingsCents + cart.discountCents,
        cart.deliveryCents,
        cart.discountCents,
        cart.totalCents,
        cart.coupon?.code || null,
        cart.itemCount,
      ],
    );
    const orderId = rows[0].id;
    for (const line of cart.lines) {
      await client.query(
        `insert into order_items (order_id, product_slug, name, unit, image_url, price_cents, compare_at_cents, quantity)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [orderId, line.slug, line.name, line.unit, line.imageUrl, line.priceCents, line.compareAtCents, line.quantity],
      );
    }
    await client.query("delete from cart_items where cart_id = $1", [picked.cart.id]);
    await client.query("update carts set coupon_code = null where id = $1", [picked.cart.id]);
    return orderNumber;
  });

  res.json({ orderNumber: created, totalCents: cart.totalCents });
});

app.post("/api/orders/track", async (req, res) => {
  const orderNumber = String(req.body?.orderNumber || "").trim().toUpperCase();
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!orderNumber || !email) return res.status(422).json({ error: "Enter your order number and email" });
  const { rows } = await pool.query(
    "select * from orders where order_number = $1 and lower(email) = $2 limit 1",
    [orderNumber, email],
  );
  if (!rows[0]) return res.status(404).json({ error: "We couldn't find that order." });
  const { rows: items } = await pool.query("select * from order_items where order_id = $1", [rows[0].id]);
  res.json({ order: { ...rows[0], items } });
});

app.post("/api/auth/demo", async (req, res) => {
  const userId = await ensureDemoAccount();
  const { rows } = await pool.query("select id, email, name, phone from users where id = $1", [userId]);
  const token = randomBytes(32).toString("hex");
  await pool.query("insert into sessions (token, user_id, expires_at) values ($1,$2, now() + interval '30 days')", [
    token,
    userId,
  ]);
  const picked = await pickCart(req);
  if (picked?.cart) await pool.query("update carts set user_id = $2 where id = $1", [picked.cart.id, userId]);
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
  res.json({ user: rows[0], token });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const { rows } = await pool.query("select * from users where email = $1", [email]);
  const user = rows[0];
  if (!user || !verifyPassword(String(req.body?.password || ""), user.password_hash)) {
    return res.status(401).json({ error: "That email and password don't match our records." });
  }
  const token = randomBytes(32).toString("hex");
  await pool.query("insert into sessions (token, user_id, expires_at) values ($1,$2, now() + interval '30 days')", [
    token,
    user.id,
  ]);
  res.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone }, token });
});

app.get("/api/account/orders", async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: "Please sign in" });
  const { rows } = await pool.query("select * from orders where user_id = $1 order by created_at desc", [user.id]);
  res.json({ orders: rows });
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const server = app.listen(PORT, () => {
  console.log(`Fresco backend listening on http://localhost:${PORT}`);
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@/]+@/, ":****@")}`);
});

const shutdown = async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
