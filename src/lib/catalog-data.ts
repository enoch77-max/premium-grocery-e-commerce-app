/**
 * Backwards-compatible entry point for the seed catalogue.
 *
 * The 1,196-line file this replaced is now organised by feature:
 *   src/features/catalog/data/categories.ts
 *   src/features/catalog/data/products/<aisle>.ts   (one file per aisle)
 *   src/features/catalog/data/offers.ts | bundles.ts | coupons.ts
 *
 * Everything below is a re-export so existing imports keep working while new code
 * follows the feature layout.
 */
export {
  categoryBySlug,
  productBySlug,
  seedBundles,
  seedCategories,
  seedCoupons,
  seedOffers,
  seedProducts,
  trendingSearches,
} from "@/features/catalog/data";
