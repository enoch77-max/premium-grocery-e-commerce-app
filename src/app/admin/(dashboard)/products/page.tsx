import { desc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductManager } from "@/components/admin/product-manager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const rows = await db.select().from(products).orderBy(desc(products.popularity)).limit(300);
  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight">Catalogue</h1>
        <p className="text-[11.5px] text-ink-soft">
          Edit price, stock and badges. Unpublishing hides a product from the storefront instantly.
        </p>
      </div>
      <ProductManager
        initialProducts={rows.map((product) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          categorySlug: product.categorySlug,
          priceCents: product.priceCents,
          compareAtCents: product.compareAtCents,
          stock: product.stock,
          isActive: product.isActive,
          badge: product.badge,
        }))}
      />
    </div>
  );
}
