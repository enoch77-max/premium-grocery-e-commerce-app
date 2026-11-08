import { getCategories } from "@/lib/store";
import { HeaderClient } from "@/components/header-client";

export async function SiteHeader() {
  const categories = await getCategories();
  return <HeaderClient categories={categories} />;
}
