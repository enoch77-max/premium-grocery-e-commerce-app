/**
 * Idempotent owner bootstrap. Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
 * Run after schema push:  node scripts/seed-admin.mjs
 */
import { randomBytes, scryptSync } from "node:crypto";
import { Client } from "pg";
import "dotenv/config";

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
const name = process.env.ADMIN_NAME || "Store Owner";

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  process.exit(1);
}
if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters");
  process.exit(1);
}

const hash = (value) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
};

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(
    `insert into users (email, name, phone, password_hash, role, is_active, marketing_opt_in)
     values ($1, $2, '', $3, 'admin', true, false)
     on conflict (email) do update
       set password_hash = excluded.password_hash,
           role = 'admin',
           is_active = true,
           name = excluded.name
     returning id, email, role`,
    [email, name, hash(password)],
  );
  const { rows } = await client.query("select id, email, role from users where email = $1", [email]);
  console.log("admin ready:", rows[0]);

  // Demo shopper: created/refreshed only when demo data is enabled. This makes the
  // documented demo credentials exist in a fresh production database too.
  if (process.env.SEED_DEMO_DATA !== "0") {
    const demoEmail = process.env.DEMO_EMAIL || "jordan@fresco.demo";
    const demoPassword = process.env.DEMO_PASSWORD || "frescodemo";
    const demoName = process.env.DEMO_NAME || "Jordan Smith";
    await client.query(
      `insert into users (email, name, phone, password_hash, marketing_opt_in, role, is_active)
       values ($1, $2, '(555) 012-3456', $3, true, 'customer', true)
       on conflict (email) do update
         set password_hash = excluded.password_hash, is_active = true`,
      [demoEmail, demoName, hash(demoPassword)],
    );
    const demo = await client.query("select id, email, role from users where email = $1", [demoEmail]);
    console.log("demo shopper ready:", demo.rows[0]);
  } else {
    console.log("demo shopper skipped (SEED_DEMO_DATA=0)");
  }
} finally {
  await client.end();
}
