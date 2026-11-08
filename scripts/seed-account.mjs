import { Client } from "pg";
import { randomBytes, scryptSync } from "node:crypto";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const email = "jordan@fresco.demo";
const password = "frescodemo";

const client = new Client({ connectionString });
await client.connect();

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
const passwordHash = `${salt}:${hash}`;

const userResult = await client.query(
  `insert into users (email, name, phone, password_hash, marketing_opt_in)
   values ($1, $2, $3, $4, true)
   on conflict (email) do update set password_hash = excluded.password_hash, name = excluded.name
   returning id`,
  [email, "Jordan Smith", "(555) 012-3456", passwordHash],
);
const userId = userResult.rows[0].id;

const existingAddresses = await client.query("select id from addresses where user_id = $1", [userId]);
if (existingAddresses.rowCount === 0) {
  await client.query(
    `insert into addresses (user_id, label, recipient, line1, line2, city, postcode, phone, instructions, is_default)
     values ($1, 'Home', 'Jordan Smith', '402 7th Avenue', 'Apt 3B', 'Brooklyn', '11215', '(555) 012-3456', 'Buzzer 12, leave at the door', true)`,
    [userId],
  );
  await client.query(
    `insert into addresses (user_id, label, recipient, line1, line2, city, postcode, phone, instructions, is_default)
     values ($1, 'Work', 'Jordan Smith', '88 Orchard Street', 'Floor 4', 'Brooklyn', '11211', '(555) 012-3456', 'Reception desk', false)`,
    [userId],
  );
}

const existingSaved = await client.query("select id from saved_items where user_id = $1", [userId]);
if (existingSaved.rowCount === 0) {
  await client.query(
    `insert into saved_items (user_id, product_slug) values ($1, $2), ($1, $3) on conflict do nothing`,
    [userId, "wild-yeast-sourdough", "organic-hass-avocados"],
  );
}

console.log(`Demo account ready: ${email} / ${password} (user ${userId})`);
await client.end();
