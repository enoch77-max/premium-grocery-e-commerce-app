import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { audit, withAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const FLOW = ["confirmed", "packing", "on_the_way", "delivered"] as const;

export const GET = withAdmin(async (_admin, request) => {
  const status = new URL(request.url).searchParams.get("status");
  const rows = status && status !== "all"
    ? await db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.createdAt)).limit(100)
    : await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  return { orders: rows, flow: FLOW };
});

export const PATCH = withAdmin(async (admin, request) => {
  const body = (await request.json().catch(() => ({}))) as { orderNumber?: string; status?: string };
  const orderNumber = String(body.orderNumber ?? "").slice(0, 40);
  const status = String(body.status ?? "");
  if (!orderNumber) throw new Error("orderNumber is required");
  if (![...FLOW, "cancelled"].includes(status as (typeof FLOW)[number] | "cancelled")) {
    throw new Error("Unknown order status");
  }

  const [existing] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!existing) throw new Error("Order not found");
  if (existing.status === "cancelled" && status !== "cancelled") {
    throw new Error("Cancelled orders cannot be reopened");
  }

  const [updated] = await db
    .update(orders)
    .set({
      status,
      cancelledAt: status === "cancelled" ? new Date() : existing.cancelledAt,
    })
    .where(eq(orders.orderNumber, orderNumber))
    .returning();

  await audit(admin, "order.status", "order", orderNumber, `${existing.status} → ${status}`);
  return { order: updated };
});
