import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { claimGuestOrders, createSession, normaliseEmail, rateLimit, verifyPassword } from "@/lib/auth";
import { getOrCreateCartToken, linkCartToUser } from "@/lib/cart-server";
import { ensureConfiguredAccounts } from "@/lib/configured-accounts";
import { ensureDemoAccount } from "@/lib/demo-account";
import { resolveDemoAccount } from "@/lib/demo";
import { demoDataEnabled } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = normaliseEmail(body.email ?? "");
  const password = body.password ?? "";

  if (!rateLimit(`login:${email || "anon"}`, 10, 60_000)) {
    return Response.json({ error: "Too many attempts — please wait a minute." }, { status: 429 });
  }
  if (!email || !password) {
    return Response.json({ error: "Enter your email and password" }, { status: 422 });
  }

  try {
    // Creates/refreshes the owner + demo accounts from env on first use, so the
    // credentials configured in the hosting dashboard always sign in.
    await ensureConfiguredAccounts();

    // Signing into the demo shopper also guarantees its sample addresses, saved
    // items and orders exist, so the account never opens empty.
    const demo = await resolveDemoAccount();
    if (email === demo.email && demoDataEnabled()) {
      await ensureDemoAccount();
    }

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json({ error: "That email and password don't match our records." }, { status: 401 });
    }
    if (!user.isActive) {
      return Response.json(
        {
          error: "This account has been closed. Reply to any receipt email and we can reopen it for you.",
          code: "ACCOUNT_CLOSED",
        },
        { status: 403 },
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
        marketingOptIn: user.marketingOptIn,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (error) {
    console.error("login failed", error);
    return Response.json({ error: "We couldn't sign you in. Please try again." }, { status: 500 });
  }
}
