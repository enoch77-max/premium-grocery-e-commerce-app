import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isServiceable } from "@/lib/delivery";

export const dynamic = "force-dynamic";

type AddressPayload = {
  label?: string;
  recipient?: string;
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
  phone?: string;
  instructions?: string;
  isDefault?: boolean;
};

export function validateAddress(body: AddressPayload) {
  const errors: Record<string, string> = {};
  const line1 = (body.line1 ?? "").trim();
  const city = (body.city ?? "").trim();
  const postcode = (body.postcode ?? "").trim();
  const recipient = (body.recipient ?? "").trim();

  if (recipient.length < 2) errors.recipient = "Who should we ask for?";
  if (line1.length < 4) errors.line1 = "Add a street address";
  if (city.length < 2) errors.city = "Add a city";
  if (postcode.length < 3) errors.postcode = "Add a postcode";
  else if (!isServiceable(postcode)) errors.postcode = "We don't deliver to that postcode yet";

  return { errors, clean: { ...body, line1, city, postcode, recipient } };
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, user.id))
    .orderBy(asc(addresses.id));
  return Response.json({ addresses: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as AddressPayload;
  const { errors, clean } = validateAddress(body);
  if (Object.keys(errors).length) {
    return Response.json({ error: "Please check the highlighted fields", errors }, { status: 422 });
  }

  const existing = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, user.id));
  const makeDefault = body.isDefault === true || existing.length === 0;

  if (makeDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  }

  const inserted = await db
    .insert(addresses)
    .values({
      userId: user.id,
      label: (clean.label ?? "Home").trim().slice(0, 30) || "Home",
      recipient: clean.recipient,
      line1: clean.line1,
      line2: (body.line2 ?? "").trim(),
      city: clean.city,
      postcode: clean.postcode,
      phone: (body.phone ?? "").trim(),
      instructions: (body.instructions ?? "").trim().slice(0, 200),
      isDefault: makeDefault,
    })
    .returning();

  return Response.json({ address: inserted[0] });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as AddressPayload & { id?: number; setDefault?: boolean };
  const id = Number(body.id);
  if (!Number.isFinite(id)) return Response.json({ error: "Address id required" }, { status: 400 });

  const owned = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)))
    .limit(1);
  if (!owned.length) return Response.json({ error: "Address not found" }, { status: 404 });

  if (body.setDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
    await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, id));
    const rows = await db.select().from(addresses).where(eq(addresses.userId, user.id));
    return Response.json({ addresses: rows });
  }

  const { errors, clean } = validateAddress(body);
  if (Object.keys(errors).length) {
    return Response.json({ error: "Please check the highlighted fields", errors }, { status: 422 });
  }

  await db
    .update(addresses)
    .set({
      label: (clean.label ?? "Home").trim().slice(0, 30) || "Home",
      recipient: clean.recipient,
      line1: clean.line1,
      line2: (body.line2 ?? "").trim(),
      city: clean.city,
      postcode: clean.postcode,
      phone: (body.phone ?? "").trim(),
      instructions: (body.instructions ?? "").trim().slice(0, 200),
    })
    .where(eq(addresses.id, id));

  const rows = await db.select().from(addresses).where(eq(addresses.userId, user.id));
  return Response.json({ addresses: rows });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isFinite(id)) return Response.json({ error: "Address id required" }, { status: 400 });

  const rows = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)))
    .limit(1);
  if (!rows.length) return Response.json({ error: "Address not found" }, { status: 404 });

  await db.delete(addresses).where(eq(addresses.id, id));

  if (rows[0].isDefault) {
    const remaining = await db.select().from(addresses).where(eq(addresses.userId, user.id)).limit(1);
    if (remaining[0]) {
      await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, remaining[0].id));
    }
  }

  const all = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(asc(addresses.id));
  return Response.json({ addresses: all });
}
