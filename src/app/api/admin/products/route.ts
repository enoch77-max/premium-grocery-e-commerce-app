import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { audit, clampInt, cleanText, withAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async () => {
  const rows = await db.select().from(products).orderBy(desc(products.popularity)).limit(300);
  return { products: rows };
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70);
}

export const POST = withAdmin(async (admin, request) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = cleanText(body.name, 120);
  const brand = cleanText(body.brand, 80, "Fresco");
  const categorySlug = cleanText(body.categorySlug, 60);
  const unit = cleanText(body.unit, 60, "each");
  const priceCents = clampInt(body.priceCents, 1, 100_000_000, 0);

  if (name.length < 2) throw new Error("Product name is required");
  if (!priceCents) throw new Error("Set a price above zero");

  const [category] = await db
    .execute<{
      image_url: string | null;
    }>(sql`select image_url from categories where slug = ${categorySlug} limit 1`)
    .then((result) => result.rows);

  let slug = slugify(name) || `product-${Date.now()}`;
  const clash = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  if (clash.length) slug = `${slug}-${Date.now().toString().slice(-5)}`;

  const [maxRow] = await db.select({ max: sql<number>`coalesce(max(sort_order), 0)::int` }).from(products);

  const [created] = await db
    .insert(products)
    .values({
      slug,
      name,
      brand,
      categorySlug: categorySlug || "pantry",
      unit,
      priceCents,
      compareAtCents: body.compareAtCents ? clampInt(body.compareAtCents, 0, 100_000_000, 0) || null : null,
      imageUrl: cleanText(body.imageUrl, 500, category?.image_url ?? "/icon.svg"),
      description: cleanText(body.description, 400, `${name}, hand-picked by our buyers.`),
      stock: clampInt(body.stock, 0, 100_000, 25),
      badge: cleanText(body.badge, 40) || null,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      sortOrder: (maxRow?.max ?? 0) + 1,
      popularity: clampInt(body.popularity, 0, 100, 50),
    })
    .returning();

  await audit(admin, "product.create", "product", created.id, `${name} · ${priceCents}`);
  return { product: created };
});

export const PATCH = withAdmin(async (admin, request) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = clampInt(body.id, 1, Number.MAX_SAFE_INTEGER, 0);
  if (!id) throw new Error("Product id is required");

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) throw new Error("Product not found");

  const patch: Record<string, unknown> = {};
  if (body.priceCents !== undefined)
    patch.priceCents = clampInt(body.priceCents, 1, 100_000_000, existing.priceCents);
  if (body.compareAtCents !== undefined) {
    const compare = clampInt(body.compareAtCents, 0, 100_000_000, 0);
    patch.compareAtCents = compare > 0 ? compare : null;
  }
  if (body.stock !== undefined) patch.stock = clampInt(body.stock, 0, 100_000, existing.stock);
  if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive);
  if (body.badge !== undefined) patch.badge = cleanText(body.badge, 40) || null;

  if (Object.keys(patch).length === 0) throw new Error("Nothing to update");

  const [updated] = await db.update(products).set(patch).where(eq(products.id, id)).returning();
  await audit(admin, "product.update", "product", id, Object.keys(patch).join(", "));
  return { product: updated };
});
