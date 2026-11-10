/**
 * Rotates an existing account password and signs out every device.
 *   ADMIN_EMAIL=owner@shop.com ADMIN_PASSWORD='new-strong-password' node scripts/rotate-admin-password.mjs
 */
import { randomBytes, scryptSync } from "node:crypto";
import { Client } from "pg";
import "dotenv/config";

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
if (!email || password.length < 12) {
  console.error("Need ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rowCount } = await client.query("update users set password_hash = $2 where email = $1", [email, hash]);
  if (!rowCount) {
    console.error(`No account for ${email}`);
    process.exit(1);
  }
  const { rows } = await client.query(
    "delete from sessions where user_id = (select id from users where email = $1) returning id",
    [email],
  );
  console.log(`Rotated ${email}; revoked ${rows.length} session(s).`);
} finally {
  await client.end();
}
