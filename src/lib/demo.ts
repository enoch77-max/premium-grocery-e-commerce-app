import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Demo shopper credentials.
 *
 * Resolved from the environment so a deployment controls them:
 *   DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME, DEMO_PHONE
 *
 * These were previously hardcoded, which meant setting the variables in the
 * hosting dashboard had no effect — the demo account was always created as
 * jordan@fresco.demo. Never reintroduce literals here.
 */
export type DemoAccount = {
  name: string;
  email: string;
  password: string;
  phone: string;
};

export const DEFAULT_DEMO_ACCOUNT: DemoAccount = {
  name: "Jordan Smith",
  email: "jordan@fresco.demo",
  password: "frescodemo",
  phone: "(555) 012-3456",
};

export function demoAccount(): DemoAccount {
  return {
    name: process.env.DEMO_NAME?.trim() || DEFAULT_DEMO_ACCOUNT.name,
    email: (process.env.DEMO_EMAIL?.trim() || DEFAULT_DEMO_ACCOUNT.email).toLowerCase(),
    password: process.env.DEMO_PASSWORD || DEFAULT_DEMO_ACCOUNT.password,
    phone: process.env.DEMO_PHONE?.trim() || DEFAULT_DEMO_ACCOUNT.phone,
  };
}

/** True when the deployment configured its own demo credentials. */
export function demoAccountConfigured() {
  return Boolean(process.env.DEMO_EMAIL?.trim() && process.env.DEMO_PASSWORD);
}

/**
 * @deprecated Read `demoAccount()` instead; kept so older imports keep compiling.
 * Evaluated lazily so server code always sees the live environment.
 */
export const DEMO_ACCOUNT: DemoAccount = {
  get name() {
    return demoAccount().name;
  },
  get email() {
    return demoAccount().email;
  },
  get password() {
    return demoAccount().password;
  },
  get phone() {
    return demoAccount().phone;
  },
};

/**
 * The demo identity persisted for this deployment.
 *
 * Precedence: environment → identity recorded in `store_settings` (written the
 * first time the environment was seen) → documented default. This keeps the
 * "demo shopper" button pointing at the account the owner actually configured
 * even when the platform restarts without the variables.
 */
export async function resolveDemoAccount(): Promise<DemoAccount> {
  const fromEnv = demoAccount();
  if (process.env.DEMO_EMAIL?.trim()) return fromEnv;

  try {
    const result = await db.execute<{ email: string; name: string }>(
      sql`select demo_email as email, demo_name as name from store_settings where id = 1 limit 1`,
    );
    const row = result.rows[0];
    if (row?.email) {
      return { ...fromEnv, email: row.email.toLowerCase(), name: row.name || fromEnv.name };
    }
  } catch {
    // fall through to the default identity
  }
  return fromEnv;
}

/** Records the identity once so future restarts keep using it. */
export async function persistDemoIdentity(account: DemoAccount) {
  if (!account.email) return;
  try {
    await db.execute(sql`
      insert into store_settings (id, demo_email, demo_name)
      values (1, ${account.email.toLowerCase()}, ${account.name})
      on conflict (id) do update set demo_email = ${account.email.toLowerCase()}, demo_name = ${account.name}
    `);
  } catch (error) {
    console.error("persistDemoIdentity failed", error);
  }
}
