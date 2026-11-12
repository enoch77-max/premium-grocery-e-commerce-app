import { sql } from "drizzle-orm";
import { db } from "@/db";
import { resolveDemoAccount } from "@/lib/demo";
import { hashPassword } from "@/lib/auth";

/**
 * Guarantees the documented demo account exists with its documented password.
 * Scoped strictly to DEMO_ACCOUNT.email so real accounts are never touched.
 * Called lazily from the demo sign-in endpoint and on first render, which means
 * the demo survives a database reset without any manual seeding step.
 */
let inFlight: Promise<number | null> | null = null;

/**
 * Guarded with a shared in-flight promise. Two concurrent callers used to race:
 * both inserted `users`, the loser's `returning id` was empty, and the endpoint
 * fell back to another identity entirely (seen on the preview as the demo button
 * signing in as jordan@fresco.demo instead of the configured shopper).
 */
export async function ensureDemoAccount(): Promise<number | null> {
  if (inFlight) return inFlight;
  inFlight = ensureDemoAccountInternal()
    .catch((error: unknown) => {
      console.error("ensureDemoAccount failed", error);
      return null;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

async function ensureDemoAccountInternal(): Promise<number | null> {
  const DEMO_ACCOUNT = await resolveDemoAccount();
  try {
    const existing = await db.execute<{ id: number }>(
      sql`select id from users where email = ${DEMO_ACCOUNT.email} limit 1`,
    );

    let userId = existing.rows[0]?.id ?? null;

    if (userId) {
      // Only re-pin the password when the deployment explicitly supplies one.
      // If the variables are absent on a restart, the existing hash must survive —
      // otherwise a previously configured demo account stops accepting its password.
      if (process.env.DEMO_PASSWORD) {
        await db.execute(
          sql`update users set password_hash = ${hashPassword(DEMO_ACCOUNT.password)}
              where id = ${userId}`,
        );
      }
      await db.execute(sql`update users set is_active = true, role = 'customer' where id = ${userId}`);
    } else {
      const inserted = await db.execute<{ id: number }>(
        sql`insert into users (email, name, phone, password_hash, marketing_opt_in)
            values (${DEMO_ACCOUNT.email}, ${DEMO_ACCOUNT.name}, ${DEMO_ACCOUNT.phone}, ${hashPassword(
              DEMO_ACCOUNT.password,
            )}, true)
            on conflict (email) do nothing
            returning id`,
      );
      userId = inserted.rows[0]?.id ?? null;
    }

    if (!userId) return null;

    const addressCount = await db.execute<{ count: string }>(
      sql`select count(*)::text as count from addresses where user_id = ${userId}`,
    );
    if (Number(addressCount.rows[0]?.count ?? "0") === 0) {
      await db.execute(sql`
        insert into addresses (user_id, label, recipient, line1, line2, city, postcode, phone, instructions, is_default)
        values
          (${userId}, 'Home', ${DEMO_ACCOUNT.name}, '402 7th Avenue', 'Apt 3B', 'Brooklyn', '11215', ${DEMO_ACCOUNT.phone}, 'Buzzer 12, leave at the door', true),
          (${userId}, 'Work', ${DEMO_ACCOUNT.name}, '88 Orchard Street', 'Floor 4', 'Brooklyn', '11211', ${DEMO_ACCOUNT.phone}, 'Reception desk', false)
      `);
    }

    const savedCount = await db.execute<{ count: string }>(
      sql`select count(*)::text as count from saved_items where user_id = ${userId}`,
    );
    if (Number(savedCount.rows[0]?.count ?? "0") === 0) {
      await db.execute(sql`
        insert into saved_items (user_id, product_slug)
        values (${userId}, 'wild-yeast-sourdough'), (${userId}, 'organic-hass-avocados')
        on conflict do nothing
      `);
    }

    // Seed two past orders so order history, tracking and reorder are usable the
    // first time someone opens the demo account.
    const orderCount = await db.execute<{ count: string }>(
      sql`select count(*)::text as count from orders where user_id = ${userId}`,
    );
    if (Number(orderCount.rows[0]?.count ?? "0") === 0) {
      const catalogue = await db.execute<{
        slug: string;
        name: string;
        unit: string;
        image_url: string;
        price_cents: number;
        compare_at_cents: number | null;
      }>(sql`
        select slug, name, unit, image_url, price_cents, compare_at_cents
        from products where is_active order by popularity desc limit 4
      `);

      const lines = catalogue.rows;
      if (lines.length) {
        const seedOrder = async (suffix: string, status: string, daysAgo: number, picks: number[]) => {
          const chosen = picks.map((index) => lines[index % lines.length]);
          const subtotal = chosen.reduce((sum, item) => sum + item.price_cents, 0);
          const delivery = subtotal >= 3500 ? 0 : 399;
          const total = subtotal + delivery;
          // Unique per shopper: a fixed number collides when more than one demo
          // identity exists (or after the demo email is reconfigured).
          const number = `FR-D${String(userId).padStart(3, "0")}${suffix}`;
          const inserted = await db.execute<{ id: number }>(sql`
            insert into orders (order_number, user_id, customer_name, email, phone, address, city, postcode,
              delivery_slot, payment_method, notes, subtotal_cents, savings_cents, delivery_cents, discount_cents,
              total_cents, item_count, status, created_at)
            values (${number}, ${userId}, ${DEMO_ACCOUNT.name}, ${DEMO_ACCOUNT.email}, ${DEMO_ACCOUNT.phone},
              '402 7th Avenue, Apt 3B', 'Brooklyn', '11215', 'today-18', 'card', '',
              ${subtotal}, 0, ${delivery}, 0, ${total}, ${chosen.length}, ${status},
              now() - (${daysAgo} || ' days')::interval)
            on conflict (order_number) do nothing
            returning id
          `);
          const orderId = inserted.rows[0]?.id;
          if (!orderId) return;
          for (const item of chosen) {
            await db.execute(sql`
              insert into order_items (order_id, product_slug, name, unit, image_url, price_cents, compare_at_cents, quantity)
              values (${orderId}, ${item.slug}, ${item.name}, ${item.unit}, ${item.image_url},
                      ${item.price_cents}, ${item.compare_at_cents}, 1)
            `);
          }
        };

        await seedOrder("1001", "delivered", 9, [0, 1]);
        await seedOrder("1002", "out-for-delivery", 0, [2]);
      }
    }

    return userId;
  } catch (error) {
    console.error("ensureDemoAccount failed", error);
    return null;
  }
}
