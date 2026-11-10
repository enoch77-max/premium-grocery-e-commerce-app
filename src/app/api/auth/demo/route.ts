import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { claimGuestOrders, clientKey, createSession, hashPassword, rateLimit } from "@/lib/auth";
import { getOrCreateCartToken, linkCartToUser } from "@/lib/cart-server";
import { ensureDemoAccount } from "@/lib/demo-account";
import { persistDemoIdentity, resolveDemoAccount } from "@/lib/demo";
import { ensureConfiguredAccounts } from "@/lib/configured-accounts";
import { demoDataEnabled } from "@/lib/seed";

export const dynamic = "force-dynamic";

/**
 * Demo sign-in. Self-healing: recreates the documented demo account if the
 * database was reset, so the button on /login always works. Only the demo
 * account is ever touched.
 */
export async function POST(request: Request) {
  const DEMO_ACCOUNT = await resolveDemoAccount();
  if (!demoDataEnabled()) {
    return Response.json({ error: "Demo sign-in is disabled on this store." }, { status: 404 });
  }
  // Per-browser key, not one global bucket: previously every visitor shared the
  // same allowance, so a handful of clicks locked the demo out for everyone.
  if (!rateLimit(clientKey(request, "demo-login"), 30, 60_000)) {
    return Response.json(
      { error: "That was a lot of attempts — give it a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // Env-configured accounts are created on demand, so the demo works in any
  // environment even when deploy scripts never ran.
  await ensureConfiguredAccounts();
  await persistDemoIdentity(DEMO_ACCOUNT);
  let userId = await ensureDemoAccount();
  if (!userId) {
    // Self-heal once: the account may have been removed between seed runs.
    try {
      await db.execute(sql`
        insert into users (email, name, phone, password_hash, marketing_opt_in, role, is_active)
        values (${DEMO_ACCOUNT.email}, ${DEMO_ACCOUNT.name}, ${DEMO_ACCOUNT.phone},
                ${hashPassword(DEMO_ACCOUNT.password)}, true, 'customer', true)
        on conflict (email) do update set password_hash = excluded.password_hash, is_active = true
      `);
      userId = await ensureDemoAccount();
    } catch (error) {
      console.error("demo bootstrap failed", error);
    }
  }
  if (!userId) {
    return Response.json(
      { error: "The demo account is unavailable right now. Please try again in a moment." },
      { status: 503 },
    );
  }

  try {
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = rows[0];
    if (!user) return Response.json({ error: "The demo account is unavailable." }, { status: 500 });

    // Safety net: never sign a shopper into an identity other than the one this
    // deployment configured (e.g. after the demo email was changed).
    if (user.email.toLowerCase() !== DEMO_ACCOUNT.email.toLowerCase()) {
      console.error(`demo identity mismatch: ${user.email} != ${DEMO_ACCOUNT.email}`);
      return Response.json(
        { error: "Demo sign-in is being repaired. Please use the email and password fields." },
        { status: 503 },
      );
    }

    await claimGuestOrders(user.id, user.email);
    const cartToken = await getOrCreateCartToken(request);
    await linkCartToUser(cartToken, user.id);
    const token = await createSession(user.id, request.headers.get("user-agent") ?? "");

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        marketingOptIn: user.marketingOptIn,
        createdAt: user.createdAt.toISOString(),
      },
      token,
      demo: DEMO_ACCOUNT.email,
    });
  } catch (error) {
    console.error("demo login failed", error);
    return Response.json({ error: "We couldn't start the demo session." }, { status: 500 });
  }
}
