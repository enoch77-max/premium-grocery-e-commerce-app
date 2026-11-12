import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { paymentMethods, products, recurringListItems, recurringLists, recurringRuns } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isServiceable } from "@/lib/delivery";
import { listStatus, createList } from "@/features/recurring/services/lists";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const rows = await db
    .select()
    .from(recurringLists)
    .where(eq(recurringLists.userId, user.id))
    .orderBy(desc(recurringLists.createdAt));

  if (!rows.length) return Response.json({ lists: [], items: [], runs: [], gateway: listStatus() });

  const ids = rows.map((row) => row.id);
  const [items, runs] = await Promise.all([
    db
      .select({
        id: recurringListItems.id,
        listId: recurringListItems.listId,
        productId: recurringListItems.productId,
        quantity: recurringListItems.quantity,
        priceAtCreationCents: recurringListItems.priceAtCreationCents,
        name: products.name,
        unit: products.unit,
        imageUrl: products.imageUrl,
        priceCents: products.priceCents,
      })
      .from(recurringListItems)
      .leftJoin(products, eq(products.id, recurringListItems.productId))
      .where(inArray(recurringListItems.listId, ids)),
    db
      .select()
      .from(recurringRuns)
      .where(inArray(recurringRuns.listId, ids))
      .orderBy(desc(recurringRuns.scheduledFor))
      .limit(200),
  ]);

  return Response.json({ lists: rows, items, runs, gateway: listStatus() });
}

type ItemInput = { productId?: number; quantity?: number };

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    cadence?: string;
    localTime?: string;
    timezone?: string;
    shortagePolicy?: string;
    paymentMethodId?: number;
    items?: ItemInput[];
    consent?: boolean;
    consentIp?: string;
    anchorWeekday?: number;
    anchorDay?: number;
    addressLine1?: string;
    addressCity?: string;
    addressPostcode?: string;
  };

  const name = (body.name ?? "").trim();
  const cadence = String(body.cadence ?? "");
  const timezone = (body.timezone ?? "UTC").trim();
  const localTime = (body.localTime ?? "").trim();
  const items = Array.isArray(body.items) ? body.items : [];

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Give this list a name";
  if (!["daily", "weekly", "monthly"].includes(cadence)) errors.cadence = "Choose daily, weekly or monthly";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime)) errors.localTime = "Use 24-hour HH:MM";
  if (!items.length) errors.items = "Add at least one item";
  if (!body.consent) errors.consent = "You must agree to automatic charges";

  // Consent is explicit and timestamped; no list can be created without it.
  const gatewayCanCharge = listStatus().configured;
  if (!body.paymentMethodId && gatewayCanCharge) {
    errors.paymentMethodId = "Choose a saved payment method";
  }

  if (Object.keys(errors).length) {
    return Response.json({ error: "Please check the highlighted fields", errors }, { status: 422 });
  }

  const methodId = Number(body.paymentMethodId);
  let method: typeof paymentMethods.$inferSelect | undefined;
  if (Number.isFinite(methodId) && methodId > 0) {
    [method] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, methodId)).limit(1);
    if (!method || method.userId !== user.id) {
      return Response.json({ error: "That payment method is not yours" }, { status: 403 });
    }
  } else if (gatewayCanCharge) {
    return Response.json({ error: "Choose a saved payment method" }, { status: 422 });
  }

  if (body.addressPostcode && !isServiceable(body.addressPostcode)) {
    return Response.json({ error: "We don't deliver to that postcode" }, { status: 422 });
  }

  const productIds = items.map((item) => Number(item.productId)).filter(Number.isFinite);
  const rows = productIds.length ? await db.select().from(products).where(eq(products.isActive, true)) : [];
  const byId = new Map(rows.map((row) => [row.id, row]));

  const cleanItems = items
    .map((item) => {
      const product = byId.get(Number(item.productId));
      if (!product) return null;
      const quantity = Math.max(1, Math.min(20, Number(item.quantity ?? 1)));
      return { productId: product.id, quantity, priceAtCreationCents: product.priceCents };
    })
    .filter((item): item is { productId: number; quantity: number; priceAtCreationCents: number } =>
      Boolean(item),
    );

  if (!cleanItems.length) {
    return Response.json({ error: "None of those products are available" }, { status: 422 });
  }

  const created = await createList({
    userId: user.id,
    name,
    cadence: cadence as "daily" | "weekly" | "monthly",
    localTime,
    timezone,
    shortagePolicy: (["skip_item", "partial", "hold"].includes(String(body.shortagePolicy))
      ? String(body.shortagePolicy)
      : "partial") as "skip_item" | "partial" | "hold",
    paymentMethodId: method?.id ?? 0,
    consentIp: (body.consentIp ?? request.headers.get("x-forwarded-for") ?? "").slice(0, 80),
    anchorWeekday: body.anchorWeekday ?? null,
    anchorDay: body.anchorDay ?? null,
    addressLine1: body.addressLine1 ?? "",
    addressCity: body.addressCity ?? "",
    addressPostcode: body.addressPostcode ?? "",
    items: cleanItems,
  });

  const insertedItems = await db
    .insert(recurringListItems)
    .values(cleanItems.map((item) => ({ ...item, listId: created.id })))
    .returning({ id: recurringListItems.id });

  return Response.json({ list: created, items: insertedItems.length });
}
