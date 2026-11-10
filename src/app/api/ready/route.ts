import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Readiness probe: the process is up, the database answers, the schema is
 * migrated and the store settings row exists. Used by deploy scripts and uptime
 * monitors; deliberately returns 503 until the shop can actually serve traffic.
 */
export async function GET() {
  const checks: Record<string, boolean> = {};
  try {
    await db.execute(sql`select 1`);
    checks.database = true;

    const tables = await db.execute<{ name: string }>(sql`
      select table_name as name from information_schema.tables
      where table_schema = 'public'
        and table_name in ('products','orders','users','sessions','store_settings','audit_logs')
    `);
    checks.schema = tables.rows.length === 6;

    const products = await db.execute<{ count: string }>(sql`select count(*)::text as count from products`);
    checks.catalogue = Number(products.rows[0]?.count ?? 0) > 0;

    await db.execute(sql`insert into store_settings (id) values (1) on conflict (id) do nothing`);
    checks.settings = true;

    const ok = Object.values(checks).every(Boolean);
    return Response.json(
      { ok, checks, service: "fresco", version: process.env.npm_package_version ?? "0.1.0" },
      { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("readiness failed", error);
    return Response.json({ ok: false, checks }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
