import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { withAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async () => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      marketingOptIn: users.marketingOptIn,
      createdAt: users.createdAt,
      orderCount: sql<number>`count(${orders.id})::int`,
      lifetimeCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
      lastOrderAt: sql<string | null>`max(${orders.createdAt})`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(200);
  return { customers: rows };
});
