import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { normaliseEmail, rateLimit, validateEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Guest order tracking: the order number alone is not enough — the email must
 * match the one used at checkout, so order data is never enumerable.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { orderNumber?: string; email?: string };
  const orderNumber = (body.orderNumber ?? "").trim().toUpperCase();
  const email = normaliseEmail(body.email ?? "");

  if (!rateLimit(`track:${email || "anon"}`, 12, 60_000)) {
    return Response.json({ error: "Too many lookups — please wait a minute." }, { status: 429 });
  }
  if (!orderNumber || !validateEmail(email)) {
    return Response.json({ error: "Enter your order number and the email you used" }, { status: 422 });
  }

  try {
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.orderNumber, orderNumber), sql`lower(${orders.email}) = ${email}`))
      .limit(1);
    const order = rows[0];
    if (!order) {
      return Response.json(
        { error: "We couldn't find that order. Check the number and email — it's on your confirmation." },
        { status: 404 },
      );
    }
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return Response.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        cancelledAt: order.cancelledAt,
        totalCents: order.totalCents,
        subtotalCents: order.subtotalCents,
        deliveryCents: order.deliveryCents,
        discountCents: order.discountCents,
        savingsCents: order.savingsCents,
        couponCode: order.couponCode,
        itemCount: order.itemCount,
        deliverySlot: order.deliverySlot,
        paymentMethod: order.paymentMethod,
        customerName: order.customerName,
        address: order.address,
        city: order.city,
        postcode: order.postcode,
        notes: order.notes,
        items,
      },
    });
  } catch (error) {
    console.error("track order failed", error);
    return Response.json({ error: "We couldn't look that up. Please try again." }, { status: 500 });
  }
}
