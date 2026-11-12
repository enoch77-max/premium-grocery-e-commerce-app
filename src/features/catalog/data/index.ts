import type { Category, Product } from "@/lib/types";
import { seedCategories } from "./categories";
import { seedProducts } from "./products";

export { seedCategories } from "./categories";
export { seedProducts } from "./products";
export { seedOffers } from "./offers";
export { seedBundles } from "./bundles";
export { seedCoupons, trendingSearches } from "./coupons";

export const categoryBySlug = (slug: string): Category | undefined =>
  seedCategories.find((category) => category.slug === slug);
export const productBySlug = (slug: string): Product | undefined =>
  seedProducts.find((product) => product.slug === slug);
