import { desc, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, orders, products, users } from "@/db/schema";
import { getStoreSettings, withAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async () => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totals] = await db
    .select({
      orders: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(total_cents), 0)::int`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
      open: sql<number>`count(*) filter (where status not in ('delivered','cancelled'))::int`,
    })
    .from(orders);
  const [recentWindow] = await db
    .select({
      orders: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(total_cents), 0)::int`,
    })
    .from(orders)
    .where(gte(orders.createdAt, since));
  const [customers] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [catalogue] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where is_active)::int`,
      lowStock: sql<number>`count(*) filter (where stock <= 10)::int`,
      outOfStock: sql<number>`count(*) filter (where stock = 0)::int`,
    })
    .from(products);
  const lowStock = await db
    .select({ id: products.id, name: products.name, stock: products.stock, slug: products.slug })
    .from(products)
    .where(sql`${products.stock} <= 10`)
    .orderBy(products.stock)
    .limit(6);
  const recentOrders = await db
    .select({
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      totalCents: orders.totalCents,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(6);
  const activity = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8);
  const settings = await getStoreSettings();

  const lifetime = totals ?? { orders: 0, revenue: 0, cancelled: 0, open: 0 };
  const window = recentWindow ?? { orders: 0, revenue: 0 };
  return {
    settings,
    totals: {
      ...lifetime,
      customers: customers?.count ?? 0,
      averageOrderCents: lifetime.orders > 0 ? Math.round(lifetime.revenue / lifetime.orders) : 0,
    },
    last30Days: window,
    catalogue: catalogue ?? { total: 0, active: 0, lowStock: 0, outOfStock: 0 },
    lowStock,
    recentOrders,
    activity,
  };
});
