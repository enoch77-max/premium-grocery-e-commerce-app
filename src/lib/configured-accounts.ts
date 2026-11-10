import { sql } from "drizzle-orm";
import { db } from "@/db";
import { hashPassword } from "@/lib/auth";
import { resolveDemoAccount } from "@/lib/demo";

/**
 * Environment-driven account bootstrap.
 *
 * The hosting dashboard's env vars are the source of truth:
 *   ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME  → owner account
 *   DEMO_EMAIL / DEMO_PASSWORD / DEMO_NAME     → demo shopper
 *
 * Runs lazily on the first auth request (and from the seeder) so accounts exist
 * in any environment — including managed previews where deploy scripts are not
 * executed. Idempotent and cached per process; a failed run retries next request.
 */
export type BootstrapResult = { demo: boolean; admin: boolean };

type Cached = { result: BootstrapResult; at: number };
const cache = globalThis as typeof globalThis & { __frescoAccountBootstrap?: Cached };
const TTL_MS = 60_000;

let inFlight: Promise<BootstrapResult> | null = null;

async function upsertUser(input: {
  email: string;
  name: string;
  password: string;
  phone?: string;
  role: "admin" | "customer";
  syncPassword: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) return false;

  const hash = hashPassword(input.password);
  // `on conflict` keeps the row id and any history, and re-asserts the role so a
  // stale/inactive account self-heals after a database restore.
  const result = await db.execute<{ id: number }>(sql`
    insert into users (email, name, phone, password_hash, role, is_active, marketing_opt_in)
    values (${email}, ${input.name}, ${input.phone ?? ""}, ${hash}, ${input.role}, true, ${input.role === "customer"})
    on conflict (email) do update set
      role = ${input.role},
      is_active = true,
      name = case when ${input.name} = '' then users.name else ${input.name} end,
      phone = case when ${input.phone ?? ""} = '' then users.phone else ${input.phone ?? ""} end,
      password_hash = case when ${input.syncPassword} then ${hash} else users.password_hash end
    returning id
  `);
  return Boolean(result.rows[0]?.id);
}

async function run(): Promise<BootstrapResult> {
  const result: BootstrapResult = { demo: false, admin: false };

  // Resolves env → persisted identity → default, so bootstrapping never resurrects
  // a legacy demo account after the owner reconfigured it.
  const demo = await resolveDemoAccount();
  if (process.env.SEED_DEMO_DATA !== "0" && demo.email && demo.password) {
    result.demo = await upsertUser({
      email: demo.email,
      name: demo.name,
      password: demo.password,
      phone: demo.phone,
      role: "customer",
      // Only re-pin when the deployment explicitly supplies DEMO_PASSWORD. If the
      // variable is absent on a later restart, the persisted account keeps its own
      // password instead of being silently reset to the default.
      syncPassword: Boolean(process.env.DEMO_PASSWORD),
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    result.admin = await upsertUser({
      email: adminEmail,
      name: process.env.ADMIN_NAME?.trim() || "Store Owner",
      password: adminPassword,
      role: "admin",
      // Set ADMIN_PASSWORD_SYNC=0 to stop boot from resetting a rotated password.
      syncPassword: process.env.ADMIN_PASSWORD_SYNC !== "0",
    });
  }

  // Retire the legacy seeded identities once a deployment configures its own.
  // Without this, a preview keeps a second demo shopper and — worse — an owner
  // account whose password is published in the README.
  const legacy = [
    { email: process.env.ADMIN_EMAIL?.trim().toLowerCase() ? "owner@fresco.demo" : null },
    { email: demo.email !== "jordan@fresco.demo" ? "jordan@fresco.demo" : null },
  ].filter((entry) => entry.email) as { email: string }[];
  for (const entry of legacy) {
    await db.execute(sql`
      update users set is_active = false
      where email = ${entry.email} and role in ('admin', 'customer')
    `);
  }

  cache.__frescoAccountBootstrap = { result, at: Date.now() };
  return result;
}

/** Ensures the configured demo/owner accounts exist. Never throws. */
export async function ensureConfiguredAccounts(): Promise<BootstrapResult> {
  const cached = cache.__frescoAccountBootstrap;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.result;
  if (inFlight) return inFlight;

  inFlight = run()
    .catch((error: unknown) => {
      console.error("configured account bootstrap failed", error);
      return { demo: false, admin: false } satisfies BootstrapResult;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Forces the next call to re-run (used after an account is deleted or edited). */
export function invalidateConfiguredAccounts() {
  cache.__frescoAccountBootstrap = undefined;
}
