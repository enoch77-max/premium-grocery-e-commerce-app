import { getCategories } from "@/lib/store";
import { getStoreSettings } from "@/lib/admin";
import { HeaderClient } from "@/components/header-client";

export async function SiteHeader() {
  const [categories, settings] = await Promise.all([getCategories(), getStoreSettings()]);
  return (
    <HeaderClient
      categories={categories}
      announcement={settings.announcement}
      storeOpen={settings.storeOpen}
    />
  );
}
