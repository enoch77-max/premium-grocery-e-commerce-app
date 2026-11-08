import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe. Reports database connectivity, the row counts the
 * store depends on, and whether the optional standalone backend is configured.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    const result = await db.execute<{
      products: number;
      orders: number;
      carts: number;
      users: number;
    }>(sql`
      select
        (select count(*)::int from products) as products,
        (select count(*)::int from orders) as orders,
        (select count(*)::int from carts) as carts,
        (select count(*)::int from users) as users
    `);

    const row = result.rows[0];
    return Response.json(
      {
        ok: true,
        service: "fresco-storefront",
        database: "postgres",
        backend: process.env.BACKEND_API_URL ? "standalone" : "next-api",
        counts: row,
        latencyMs: Date.now() - startedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("health check failed", error);
    return Response.json(
      { ok: false, database: "postgres", latencyMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
