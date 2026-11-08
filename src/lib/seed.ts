import { sql } from "drizzle-orm";
import { db } from "@/db";
import { bundles, categories, coupons, offers, products } from "@/db/schema";
import { seedBundles, seedCategories, seedCoupons, seedOffers, seedProducts } from "@/lib/catalog-data";
import { ensureDemoAccount } from "@/lib/demo-account";

let seedPromise: Promise<void> | null = null;

async function runSeed() {
  await ensureDemoAccount();
  const existing = await db.execute<{ count: string }>(sql`select count(*)::text as count from categories`);
  const count = Number(existing.rows[0]?.count ?? "0");

  if (count === 0) {
    await db.execute(sql`select pg_advisory_lock(918273645)`);
    try {
      const recheck = await db.execute<{ count: string }>(sql`select count(*)::text as count from categories`);
      if (Number(recheck.rows[0]?.count ?? "0") === 0) {
        await db.insert(categories).values(seedCategories).onConflictDoNothing();
        await db
          .insert(products)
          .values(
            seedProducts.map((product) => ({
              slug: product.slug,
              name: product.name,
              brand: product.brand,
              categorySlug: product.categorySlug,
              unit: product.unit,
              priceCents: product.priceCents,
              compareAtCents: product.compareAtCents,
              imageUrl: product.imageUrl,
              description: product.description,
              tags: product.tags,
              highlights: product.highlights,
              ratingBp: Math.round(product.rating * 100),
              reviewCount: product.reviewCount,
              stock: product.stock,
              badge: product.badge,
              isOrganic: product.isOrganic,
              isVegan: product.isVegan,
              isBestseller: product.isBestseller,
              isNew: product.isNew,
              popularity: product.popularity,
              origin: product.origin,
              storage: product.storage,
              sortOrder: product.id,
            })),
          )
          .onConflictDoNothing();
        await db.insert(offers).values(seedOffers).onConflictDoNothing();
        await db
          .insert(bundles)
          .values(
            seedBundles.map((bundle) => ({
              slug: bundle.slug,
              title: bundle.title,
              subtitle: bundle.subtitle,
              itemSlugs: bundle.itemSlugs,
              priceCents: bundle.priceCents,
              compareAtCents: bundle.compareAtCents,
              badge: bundle.badge,
              theme: bundle.theme,
              emoji: bundle.emoji,
              imageUrl: bundle.imageUrl,
              sortOrder: bundle.sortOrder,
            })),
          )
          .onConflictDoNothing();
        await db.insert(coupons).values(seedCoupons).onConflictDoNothing();
      }
    } finally {
      await db.execute(sql`select pg_advisory_unlock(918273645)`);
    }
  }
}

export function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      console.error("seed failed", error);
    });
  }
  return seedPromise;
}
