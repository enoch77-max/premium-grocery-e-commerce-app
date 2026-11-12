import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { hashSessionToken } from "@/lib/auth";
import { db } from "@/db";
import { auditLogs, sessions, storeSettings, users } from "@/db/schema";

import {
  ADMIN_ROLES,
  roleHasPermission,
  type AdminPermission,
  type AdminRole,
} from "@/lib/permissions";

export { ADMIN_ROLES, roleHasPermission };
export type { AdminPermission, AdminRole };

export async function requirePermission(
  request: Request,
  permission: AdminPermission,
): Promise<{ admin: AdminUser | null; status: number | null }> {
  const admin = await getAdminUser(request);
  if (!admin) return { admin: null, status: 401 };
  if (!roleHasPermission(admin.role, permission)) return { admin: null, status: 403 };
  return { admin, status: null };
}

/** Like withAdmin but permission-scoped. Same error shape as the rest of the API. */
export function withPermission<T>(
  permission: AdminPermission,
  handler: (admin: AdminUser, request: Request) => Promise<T>,
) {
  return async (request: Request): Promise<Response> => {
    const { admin, status } = await requirePermission(request, permission);
    if (!admin) {
      return Response.json(
        { error: status === 401 ? "Please sign in" : "Your role can't do that on this page." },
        { status: status ?? 403 },
      );
    }
    try {
      const data = await handler(admin, request);
      return Response.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      console.error("admin route failed", message);
      return Response.json({ ok: false, error: message }, { status: 400 });
    }
  };
}

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
};

async function readToken(request?: Request) {
  const header = request?.headers.get("x-session-token");
  if (header) return header;
  try {
    return (await cookies()).get("fresco_session")?.value ?? null;
  } catch {
    return null;
  }
}

/** Resolves the session and asserts an admin-capable role. */
export async function getAdminUser(request?: Request): Promise<AdminUser | null> {
  const token = await readToken(request);
  if (!token) return null;
  try {
    const rows = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.token, hashSessionToken(token)),
          gt(sessions.expiresAt, new Date()),
          eq(users.isActive, true),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    if (!ADMIN_ROLES.includes(row.role as AdminRole)) return null;
    return { id: row.id, email: row.email, name: row.name, role: row.role as AdminRole };
  } catch (error) {
    console.error("getAdminUser failed", error);
    return null;
  }
}

export class AdminAuthError extends Error {
  status: number;
  constructor(status = 401) {
    super(status === 403 ? "Forbidden" : "Unauthorised");
    this.status = status;
  }
}

/** Throws AdminAuthError — wrap admin handlers in `withAdmin`. */
export async function requireAdmin(request?: Request): Promise<AdminUser> {
  const user = await getAdminUser(request);
  if (!user) throw new AdminAuthError(request ? 401 : 403);
  return user;
}

const mutationLog = new Map<string, { count: number; reset: number }>();
const MUTATION_LIMIT = 90;
const MUTATION_WINDOW_MS = 60_000;

/** Simple per-admin write budget so a runaway script cannot hammer the DB. */
function allowMutation(adminId: number) {
  const now = Date.now();
  const key = `admin:${adminId}`;
  const entry = mutationLog.get(key);
  if (!entry || entry.reset < now) {
    mutationLog.set(key, { count: 1, reset: now + MUTATION_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MUTATION_LIMIT;
}

/** Route wrapper: auth + rate limit + JSON error shaping in one place. */
export function withAdmin<T>(handler: (admin: AdminUser, request: Request) => Promise<T>) {
  return async (request: Request): Promise<Response> => {
    try {
      const admin = await requireAdmin(request);
      if (request.method !== "GET" && !allowMutation(admin.id)) {
        return Response.json(
          { ok: false, error: "Too many changes — slow down for a minute." },
          { status: 429 },
        );
      }
      const result = await handler(admin, request);
      return Response.json({ ok: true, data: result }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof AdminAuthError) {
        return Response.json({ ok: false, error: error.message }, { status: error.status });
      }
      const message = error instanceof Error ? error.message : "Unexpected error";
      console.error("admin route failed", message);
      return Response.json({ ok: false, error: message }, { status: 400 });
    }
  };
}

export async function audit(
  admin: AdminUser,
  action: string,
  entity: string,
  entityId: string | number = "",
  detail: string = "",
) {
  try {
    await db.insert(auditLogs).values({
      actorId: admin.id,
      actorEmail: admin.email,
      action,
      entity,
      entityId: String(entityId),
      detail: detail.slice(0, 500),
    });
  } catch (error) {
    // Never fail a business action because the audit write failed.
    console.error("audit write failed", error);
  }
}

export type StoreSettings = {
  storeOpen: boolean;
  announcement: string;
  supportEmail: string;
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number;
  demoEmail?: string;
  demoName?: string;
  /** Shortage-alert lead time in whole days (1–3). */
  shortageLeadDays: number;
  /** Roles that receive internal shortage alerts. */
  alertRoles: string[];
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeOpen: true,
  announcement: "Free delivery over $35",
  supportEmail: "hello@fresco.demo",
  deliveryFeeCents: 399,
  freeDeliveryThresholdCents: 3500,
  shortageLeadDays: 1,
  alertRoles: ["admin", "stock_manager"],
};

type CachedSettings = { value: StoreSettings; at: number };
const settingsCache = globalThis as typeof globalThis & { __frescoSettings?: CachedSettings };
const SETTINGS_TTL_MS = 10_000;

/** Drops the cache so an admin save is visible on the next request. */
export function invalidateSettingsCache() {
  settingsCache.__frescoSettings = undefined;
}

/** Reads the single settings row, creating it on first use (10s cache). */
export async function getStoreSettings(): Promise<StoreSettings> {
  const cached = settingsCache.__frescoSettings;
  if (cached && Date.now() - cached.at < SETTINGS_TTL_MS) return cached.value;
  try {
    const rows = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
    if (!rows[0]) {
      await db.insert(storeSettings).values({ id: 1 }).onConflictDoNothing();
      return DEFAULT_SETTINGS;
    }
    const row = rows[0];
    const value: StoreSettings = {
      storeOpen: row.storeOpen,
      announcement: row.announcement,
      supportEmail: row.supportEmail,
      deliveryFeeCents: row.deliveryFeeCents,
      freeDeliveryThresholdCents: row.freeDeliveryThresholdCents,
      demoEmail: row.demoEmail ?? "",
      demoName: row.demoName ?? "",
      shortageLeadDays: row.shortageLeadDays ?? 1,
      alertRoles: row.alertRoles ?? ["admin", "stock_manager"],
    };
    settingsCache.__frescoSettings = { value, at: Date.now() };
    return value;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function cleanText(value: unknown, max = 200, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, max);
  return trimmed || fallback;
}
