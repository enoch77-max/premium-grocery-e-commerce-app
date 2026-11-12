import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";
import { audit, getStoreSettings, invalidateSettingsCache, withPermission } from "@/lib/admin";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["admin", "manager", "stock_manager", "seller"];

export const GET = withPermission("recurring.settings", async () => getStoreSettings());

export const PATCH = withPermission("recurring.settings", async (admin, request) => {
  const body = (await request.json().catch(() => ({}))) as {
    shortageLeadDays?: unknown;
    alertRoles?: unknown;
  };

  const current = await getStoreSettings();
  const lead = Number(body.shortageLeadDays ?? current.shortageLeadDays);
  if (!Number.isFinite(lead) || lead < 1 || lead > 3) {
    throw new Error("Shortage lead time must be 1, 2 or 3 days");
  }

  let roles: string[] = current.alertRoles;
  if (Array.isArray(body.alertRoles)) {
    roles = body.alertRoles.filter((role): role is string => VALID_ROLES.includes(String(role)));
    if (!roles.length) throw new Error("Pick at least one role to receive alerts");
  }

  await db
    .insert(storeSettings)
    .values({ id: 1, shortageLeadDays: Math.round(lead), alertRoles: roles })
    .onConflictDoUpdate({
      target: storeSettings.id,
      set: { shortageLeadDays: Math.round(lead), alertRoles: roles, updatedAt: new Date() },
    });
  invalidateSettingsCache();

  await audit(admin, "recurring.settings.update", "store_settings", 1, `lead=${lead}d roles=${roles.join(",")}`);
  return { shortageLeadDays: Math.round(lead), alertRoles: roles };
});
