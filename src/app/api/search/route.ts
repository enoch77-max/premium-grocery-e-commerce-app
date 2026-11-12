import { getCategories, getProducts } from "@/lib/store";
import { searchCatalog, smartDefaults } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").slice(0, 120);
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const result = query.trim()
    ? searchCatalog(query, products, categories)
    : smartDefaults(products, categories);
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
