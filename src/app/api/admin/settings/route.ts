import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";
import { audit, cleanText, clampInt, getStoreSettings, invalidateSettingsCache, withAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async () => ({ settings: await getStoreSettings() }));

export const PATCH = withAdmin(async (admin, request) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const current = await getStoreSettings();
  const next = {
    storeOpen: body.storeOpen === undefined ? current.storeOpen : Boolean(body.storeOpen),
    announcement: body.announcement === undefined ? current.announcement : cleanText(body.announcement, 90, current.announcement),
    supportEmail: body.supportEmail === undefined ? current.supportEmail : cleanText(body.supportEmail, 120, current.supportEmail),
    deliveryFeeCents: body.deliveryFeeCents === undefined ? current.deliveryFeeCents : clampInt(body.deliveryFeeCents, 0, 50_000, current.deliveryFeeCents),
    freeDeliveryThresholdCents:
      body.freeDeliveryThresholdCents === undefined
        ? current.freeDeliveryThresholdCents
        : clampInt(body.freeDeliveryThresholdCents, 0, 1_000_000, current.freeDeliveryThresholdCents),
    updatedAt: new Date(),
  };

  await db.insert(storeSettings).values({ id: 1, ...next }).onConflictDoUpdate({ target: storeSettings.id, set: next });
  await db.update(storeSettings).set(next).where(eq(storeSettings.id, 1));
  invalidateSettingsCache();
  await audit(admin, "settings.update", "settings", 1, next.storeOpen ? "store open" : "store paused");
  return { settings: next };
});
