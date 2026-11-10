import { desc } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { OrderManager } from "@/components/admin/order-manager";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight">Orders</h1>
        <p className="text-[11.5px] text-ink-soft">Advance fulfilment, cancel with a reason, or open the customer receipt.</p>
      </div>
      <OrderManager
        initialOrders={rows.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          email: order.email,
          city: order.city,
          postcode: order.postcode,
          totalCents: order.totalCents,
          itemCount: order.itemCount,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          deliverySlot: order.deliverySlot,
          paymentMethod: order.paymentMethod,
        }))}
      />
    </div>
  );
}
