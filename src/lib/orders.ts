import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import type { OrderItemRecord, OrderWithItems } from "@/lib/order-types";

export type { OrderItemRecord, OrderRecord, OrderWithItems, OrderWithItems as Order } from "@/lib/order-types";
export { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, orderStatusIndex } from "@/lib/order-types";

export async function getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
  try {
    const rows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
    const order = rows[0];
    if (!order) return null;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return { ...order, items } as OrderWithItems;
  } catch (error) {
    console.error("getOrderByNumber failed", error);
    return null;
  }
}

export async function getOrdersForUser(userId: number): Promise<OrderWithItems[]> {
  try {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
    if (!rows.length) return [];
    const items = await db
      .select()
      .from(orderItems)
      .where(
        sql`${orderItems.orderId} in (${sql.join(
          rows.map((row) => sql`${row.id}`),
          sql`, `,
        )})`,
      );
    return rows.map((row) => ({ ...row, items: items.filter((item) => item.orderId === row.id) })) as OrderWithItems[];
  } catch (error) {
    console.error("getOrdersForUser failed", error);
    return [];
  }
}

export async function getOrderForUser(orderNumber: string, userId: number): Promise<OrderWithItems | null> {
  try {
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, userId)))
      .limit(1);
    const order = rows[0];
    if (!order) return null;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return { ...order, items } as OrderWithItems;
  } catch (error) {
    console.error("getOrderForUser failed", error);
    return null;
  }
}
