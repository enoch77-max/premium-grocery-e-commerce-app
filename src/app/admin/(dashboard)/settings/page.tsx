import { getStoreSettings } from "@/lib/admin";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();
  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight">Store settings</h1>
        <p className="text-[11.5px] text-ink-soft">
          Pause the shop, change the announcement bar and set delivery pricing. Changes go live immediately.
        </p>
      </div>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
