import { asc } from "drizzle-orm";
import { db } from "@/db";
import {
  bundles as bundlesTable,
  categories as categoriesTable,
  coupons as couponsTable,
  offers as offersTable,
  products as productsTable,
} from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { seedBundles, seedCategories, seedCoupons, seedOffers, seedProducts } from "@/lib/catalog-data";
import type { Bundle, Category, Coupon, Offer, Product } from "@/lib/types";

type ProductRow = typeof productsTable.$inferSelect;
type CategoryRow = typeof categoriesTable.$inferSelect;
type OfferRow = typeof offersTable.$inferSelect;
type BundleRow = typeof bundlesTable.$inferSelect;
type CouponRow = typeof couponsTable.$inferSelect;

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    categorySlug: row.categorySlug,
    unit: row.unit,
    priceCents: row.priceCents,
    compareAtCents: row.compareAtCents,
    imageUrl: row.imageUrl,
    description: row.description,
    tags: row.tags ?? [],
    highlights: row.highlights ?? [],
    rating: row.ratingBp / 100,
    reviewCount: row.reviewCount,
    stock: row.stock,
    badge: row.badge,
    isOrganic: row.isOrganic,
    isVegan: row.isVegan,
    isBestseller: row.isBestseller,
    isNew: row.isNew,
    popularity: row.popularity,
    origin: row.origin,
    storage: row.storage,
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    emoji: row.emoji,
    imageUrl: row.imageUrl,
    accent: row.accent,
    sortOrder: row.sortOrder,
  };
}

function mapOffer(row: OfferRow): Offer {
  return {
    slug: row.slug,
    eyebrow: row.eyebrow,
    title: row.title,
    subtitle: row.subtitle,
    ctaLabel: row.ctaLabel,
    href: row.href,
    theme: row.theme,
    badge: row.badge,
    emoji: row.emoji,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
  };
}

function mapCoupon(row: CouponRow): Coupon {
  return {
    code: row.code,
    description: row.description,
    kind: row.kind,
    percentOff: row.percentOff,
    valueCents: row.valueCents,
    minSubtotalCents: row.minSubtotalCents,
  };
}

export async function getCategories(): Promise<Category[]> {
  try {
    await ensureSeeded();
    const rows = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder));
    if (rows.length) return rows.map(mapCategory);
  } catch (error) {
    console.error("getCategories fallback", error);
  }
  return seedCategories;
}

export async function getProducts(): Promise<Product[]> {
  try {
    await ensureSeeded();
    const rows = await db.select().from(productsTable).orderBy(asc(productsTable.sortOrder));
    if (rows.length) return rows.map(mapProduct);
  } catch (error) {
    console.error("getProducts fallback", error);
  }
  return seedProducts;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await getProducts();
  return all.find((product) => product.slug === slug) ?? null;
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const all = await getProducts();
  return all.filter((product) => product.categorySlug === categorySlug);
}

export async function getOffers(): Promise<Offer[]> {
  try {
    await ensureSeeded();
    const rows = await db.select().from(offersTable).orderBy(asc(offersTable.sortOrder));
    if (rows.length) return rows.map(mapOffer);
  } catch (error) {
    console.error("getOffers fallback", error);
  }
  return seedOffers;
}

export async function getCoupons(): Promise<Coupon[]> {
  try {
    await ensureSeeded();
    const rows = await db.select().from(couponsTable).orderBy(asc(couponsTable.id));
    if (rows.length) return rows.map(mapCoupon);
  } catch (error) {
    console.error("getCoupons fallback", error);
  }
  return seedCoupons;
}

export async function getBundles(): Promise<Bundle[]> {
  const allProducts = await getProducts();
  let raw: Array<Omit<Bundle, "products">> = seedBundles;

  try {
    await ensureSeeded();
    const rows = await db.select().from(bundlesTable).orderBy(asc(bundlesTable.sortOrder));
    if (rows.length) {
      raw = rows.map((row: BundleRow) => ({
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        itemSlugs: row.itemSlugs ?? [],
        priceCents: row.priceCents,
        compareAtCents: row.compareAtCents,
        badge: row.badge,
        theme: row.theme,
        emoji: row.emoji,
        imageUrl: row.imageUrl,
        sortOrder: row.sortOrder,
      }));
    }
  } catch (error) {
    console.error("getBundles fallback", error);
  }

  return raw.map((bundle) => {
    const products = bundle.itemSlugs
      .map((slug) => allProducts.find((product) => product.slug === slug))
      .filter((product): product is Product => Boolean(product));
    const livePrice = products.reduce((sum, product) => sum + product.priceCents, 0);
    const liveCompare = products.reduce(
      (sum, product) => sum + (product.compareAtCents ?? product.priceCents),
      0,
    );
    return {
      ...bundle,
      // Bundle pricing mirrors exactly what the basket will charge, so the
      // "you save" figure is always the real multi-item saving.
      priceCents: livePrice || bundle.priceCents,
      compareAtCents: liveCompare || bundle.compareAtCents,
      products,
    };
  });
}

export function bundleSavingsPercent(bundle: Bundle) {
  if (!bundle.compareAtCents) return 0;
  return Math.round(((bundle.compareAtCents - bundle.priceCents) / bundle.compareAtCents) * 100);
}
