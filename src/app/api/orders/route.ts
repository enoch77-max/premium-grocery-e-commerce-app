import { getStoreSettings } from "@/lib/admin";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses, orderItems, orders } from "@/db/schema";
import { clearCart, resolveCartForRequest } from "@/lib/cart-server";
import { orderNumber } from "@/lib/format";
import { isServiceable } from "@/lib/delivery";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type OrderPayload = {
  customerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  deliverySlot?: string;
  paymentMethod?: string;
  notes?: string;
  checkoutId?: string;
};

export async function POST(request: Request) {
  // Owner-controlled kill switch: no orders while the shop is paused.
  const settings = await getStoreSettings();
  if (!settings.storeOpen) {
    return Response.json(
      { error: "The store is paused right now — please try again shortly." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const body = (await request.json().catch(() => ({}))) as OrderPayload;
  const checkoutId = typeof body.checkoutId === "string" && body.checkoutId.length >= 8 ? body.checkoutId : null;

  // Idempotency: a retried submit (double click, refresh, flaky network) with
  // the same checkout id returns the original order instead of an error or a
  // duplicate charge.
  if (checkoutId) {
    const existing = await db
      .select({ orderNumber: orders.orderNumber, totalCents: orders.totalCents })
      .from(orders)
      .where(eq(orders.checkoutId, checkoutId))
      .limit(1);
    if (existing[0]) {
      return Response.json({ ...existing[0], alreadyPlaced: true });
    }
  }

  // Resolve across every token this browser holds. A basket that exists in
  // either storage location (cookie or localStorage) is always found here.
  const { cart, token } = await resolveCartForRequest(request);
  if (!token || !cart.lines.length) {
    return Response.json(
      {
        error: "This basket was already checked out, so there's nothing left to order.",
        code: "EMPTY_BASKET",
        cart,
      },
      { status: 409 },
    );
  }

  const customerName = (body.customerName ?? "").trim();
  const email = (body.email ?? "").trim();
  const address = (body.address ?? "").trim();
  const city = (body.city ?? "").trim();
  const postcode = (body.postcode ?? "").trim();

  const errors: Record<string, string> = {};
  if (customerName.length < 2) errors.customerName = "Please tell us your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid email for the receipt";
  if (address.length < 4) errors.address = "Add a street address";
  if (city.length < 2) errors.city = "Add a city";
  if (postcode.length < 3) errors.postcode = "Add a postcode";
  else if (!isServiceable(postcode)) errors.postcode = "We don't deliver to that postcode yet — pick another area";

  if (Object.keys(errors).length) {
    return Response.json({ error: "Please complete the highlighted fields", errors }, { status: 422 });
  }

  const deliveryCents = cart.deliveryCents;
  const discountCents = cart.discountCents;
  const totalCents = cart.totalCents;
  const number = orderNumber();
  const user = await getCurrentUser(request);

  try {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(orders)
        .values({
          orderNumber: number,
          checkoutId,
          userId: user?.id ?? null,
          customerName,
          email,
          phone: (body.phone ?? "").trim(),
          address,
          city,
          postcode,
          deliverySlot: (body.deliverySlot ?? "today-18").slice(0, 60),
          paymentMethod: (body.paymentMethod ?? "card").slice(0, 40),
          notes: (body.notes ?? "").trim().slice(0, 400),
          subtotalCents: cart.subtotalCents,
          savingsCents: cart.savingsCents + discountCents,
          deliveryCents,
          discountCents,
          totalCents,
          couponCode: cart.coupon?.code ?? null,
          itemCount: cart.itemCount,
          status: "confirmed",
        })
        .returning({ id: orders.id });

      const orderId = inserted[0]?.id;
      if (!orderId) throw new Error("Order insert failed");

      await tx.insert(orderItems).values(
        cart.lines.map((line) => ({
          orderId,
          productSlug: line.slug,
          name: line.name,
          unit: line.unit,
          imageUrl: line.imageUrl,
          priceCents: line.priceCents,
          compareAtCents: line.compareAtCents,
          quantity: line.quantity,
        })),
      );
    });

    await clearCart(token);

    // Signed-in shoppers get this address saved automatically, but only if their
    // address book is still empty — repeat customers keep their own labels.
    const shopper = await getCurrentUser(request);
    if (shopper && postcode && isServiceable(postcode)) {
      try {
        const existing = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, shopper.id)).limit(1);
        if (!existing.length) {
          await db.insert(addresses).values({
            userId: shopper.id,
            label: "Home",
            recipient: customerName,
            line1: address,
            line2: "",
            city,
            postcode,
            phone: (body.phone ?? "").trim().slice(0, 32),
            instructions: (body.notes ?? "").trim().slice(0, 300),
            isDefault: true,
          });
        }
      } catch (addressError) {
        // Never fail an order because the address book write failed.
        console.error("address autosave failed", addressError);
      }
    }

    return Response.json({ orderNumber: number, totalCents });
  } catch (error) {
    // A concurrent duplicate submit may race the unique index — return the
    // order that won instead of failing the shopper.
    if (checkoutId) {
      const raced = await db
        .select({ orderNumber: orders.orderNumber, totalCents: orders.totalCents })
        .from(orders)
        .where(eq(orders.checkoutId, checkoutId))
        .limit(1);
      if (raced[0]) return Response.json({ ...raced[0], alreadyPlaced: true });
    }
    console.error("order failed", error);
    return Response.json({ error: "We couldn't place the order. Please try again." }, { status: 500 });
  }
}
