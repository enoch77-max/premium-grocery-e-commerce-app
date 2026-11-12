import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, recurringListItems, recurringLists, recurringRunEvents, recurringRuns } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { setListStatus, updateList } from "@/features/recurring/services/lists";

export const dynamic = "force-dynamic";

async function ownedList(id: number, userId: number) {
  const [list] = await db
    .select()
    .from(recurringLists)
    .where(and(eq(recurringLists.id, id), eq(recurringLists.userId, userId)))
    .limit(1);
  return list ?? null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  const list = await ownedList(Number((await params).id), user.id);
  if (!list) return Response.json({ error: "List not found" }, { status: 404 });

  const [items, runs, events] = await Promise.all([
    db.select().from(recurringListItems).where(eq(recurringListItems.listId, list.id)),
    db
      .select()
      .from(recurringRuns)
      .where(eq(recurringRuns.listId, list.id))
      .orderBy(desc(recurringRuns.scheduledFor))
      .limit(20),
    db
      .select()
      .from(recurringRunEvents)
      .where(eq(recurringRunEvents.listId, list.id))
      .orderBy(desc(recurringRunEvents.createdAt))
      .limit(30),
  ]);

  return Response.json({ list, items, runs, events });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    reason?: string;
    name?: string;
    cadence?: string;
    localTime?: string;
    timezone?: string;
    shortagePolicy?: string;
    items?: Array<{ productId?: number; quantity?: number }>;
  };
  const id = Number((await params).id);
  const action = body.action;
  const allowed = ["pause", "resume", "cancel", "update"];

  if (!allowed.includes(String(action))) {
    return Response.json({ error: "action must be pause, resume, cancel or update" }, { status: 422 });
  }

  if (action === "update") {
    if (body.cadence && !["daily", "weekly", "monthly"].includes(body.cadence)) {
      return Response.json({ error: "Choose daily, weekly or monthly" }, { status: 422 });
    }
    if (body.localTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.localTime)) {
      return Response.json({ error: "Use 24-hour HH:MM" }, { status: 422 });
    }
    if (body.items && !body.items.length) {
      return Response.json({ error: "Keep at least one item on the list" }, { status: 422 });
    }

    const productIds = (body.items ?? []).map((item) => Number(item.productId)).filter(Number.isFinite);
    const productRows = productIds.length
      ? await db.select().from(products).where(inArray(products.id, productIds))
      : [];
    const byId = new Map(productRows.map((row) => [row.id, row]));

    const cleanItems = (body.items ?? [])
      .map((item) => {
        const product = byId.get(Number(item.productId));
        if (!product) return null;
        return {
          productId: product.id,
          quantity: Math.max(1, Math.min(20, Number(item.quantity ?? 1))),
          priceAtCreationCents: product.priceCents,
        };
      })
      .filter((item): item is { productId: number; quantity: number; priceAtCreationCents: number } =>
        Boolean(item),
      );

    const updated = await updateList(id, user.id, {
      name: body.name,
      cadence: body.cadence as "daily" | "weekly" | "monthly" | undefined,
      localTime: body.localTime,
      timezone: body.timezone,
      shortagePolicy: body.shortagePolicy as "skip_item" | "partial" | "hold" | undefined,
      items: cleanItems.length ? cleanItems : undefined,
    });
    if (!updated) return Response.json({ error: "List not found" }, { status: 404 });
    if ("rejected" in updated) {
      return Response.json({ error: "This list was cancelled — start a new one instead." }, { status: 409 });
    }
    return Response.json({ list: updated });
  }

  const row = await setListStatus(
    id,
    user.id,
    action as "pause" | "resume" | "cancel",
    body.reason ?? `customer ${action}`,
  );
  if (!row) return Response.json({ error: "List not found" }, { status: 404 });
  return Response.json({ list: row });
}
