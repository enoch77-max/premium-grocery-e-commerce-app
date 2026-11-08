import { sql } from "drizzle-orm";
import { db } from "@/db";
import { DEMO_ACCOUNT } from "@/lib/demo";
import { hashPassword } from "@/lib/auth";

/**
 * Guarantees the documented demo account exists with its documented password.
 * Scoped strictly to DEMO_ACCOUNT.email so real accounts are never touched.
 * Called lazily from the demo sign-in endpoint and on first render, which means
 * the demo survives a database reset without any manual seeding step.
 */
export async function ensureDemoAccount(): Promise<number | null> {
  try {
    const existing = await db.execute<{ id: number }>(
      sql`select id from users where email = ${DEMO_ACCOUNT.email} limit 1`,
    );

    let userId = existing.rows[0]?.id ?? null;

    if (userId) {
      await db.execute(
        sql`update users set password_hash = ${hashPassword(DEMO_ACCOUNT.password)}
            where id = ${userId}`,
      );
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

    return userId;
  } catch (error) {
    console.error("ensureDemoAccount failed", error);
    return null;
  }
}
