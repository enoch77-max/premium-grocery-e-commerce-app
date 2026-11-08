import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedItems } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ saved: [], slugs: [] });

  const rows = await db
    .select()
    .from(savedItems)
    .where(eq(savedItems.userId, user.id))
    .orderBy(desc(savedItems.createdAt));

  const products = await getProducts();
  const slugs = rows.map((row) => row.productSlug);
  return Response.json({
    slugs,
    saved: rows.map((row) => ({ id: row.id, slug: row.productSlug, product: products.find((p) => p.slug === row.productSlug) ?? null })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Sign in to save items", requiresAuth: true }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { slug?: string; action?: "add" | "remove" | "toggle" };
  const slug = (body.slug ?? "").trim();
  if (!slug) return Response.json({ error: "Product slug required" }, { status: 400 });

  const existing = await db
    .select()
    .from(savedItems)
    .where(and(eq(savedItems.userId, user.id), eq(savedItems.productSlug, slug)))
    .limit(1);

  const shouldRemove = body.action === "remove" || (body.action !== "add" && existing.length > 0);

  if (shouldRemove) {
    await db.delete(savedItems).where(and(eq(savedItems.userId, user.id), eq(savedItems.productSlug, slug)));
    return Response.json({ saved: false });
  }

  await db.insert(savedItems).values({ userId: user.id, productSlug: slug }).onConflictDoNothing();
  return Response.json({ saved: true });
}
