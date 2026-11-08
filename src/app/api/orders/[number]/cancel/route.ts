import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.orderNumber, number), eq(orders.userId, user.id)))
      .limit(1);
    const order = rows[0];
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

    if (order.status === "cancelled") {
      return Response.json({ error: "This order is already cancelled" }, { status: 409 });
    }
    if (order.status !== "confirmed" && order.status !== "packing") {
      return Response.json(
        { error: "This order is already on its way — contact us and we'll refund any issue instead." },
        { status: 409 },
      );
    }

    await db
      .update(orders)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(orders.id, order.id));

    return Response.json({ ok: true, status: "cancelled" });
  } catch (error) {
    console.error("cancel order failed", error);
    return Response.json({ error: "We couldn't cancel that order. Please try again." }, { status: 500 });
  }
}
