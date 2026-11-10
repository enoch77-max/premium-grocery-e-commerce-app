import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const staticPaths = ["", "/offers", "/search", "/track", "/login", "/info/privacy", "/info/terms", "/info/accessibility", "/info/contact"];

  return [
    ...staticPaths.map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
    })),
    ...categories.map((category) => ({
      url: `${base}/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.slice(0, 500).map((product) => ({
      url: `${base}/product/${product.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
