import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { claimGuestOrders, createSession, rateLimit } from "@/lib/auth";
import { getOrCreateCartToken, linkCartToUser } from "@/lib/cart-server";
import { ensureDemoAccount } from "@/lib/demo-account";
import { DEMO_ACCOUNT } from "@/lib/demo";

export const dynamic = "force-dynamic";

/**
 * Demo sign-in. Self-healing: recreates the documented demo account if the
 * database was reset, so the button on /login always works. Only the demo
 * account is ever touched.
 */
export async function POST(request: Request) {
  if (!rateLimit("demo-login", 20, 60_000)) {
    return Response.json({ error: "Too many attempts — please wait a minute." }, { status: 429 });
  }

  const userId = await ensureDemoAccount();
  if (!userId) {
    return Response.json({ error: "The demo account is unavailable right now." }, { status: 500 });
  }

  try {
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = rows[0];
    if (!user) return Response.json({ error: "The demo account is unavailable." }, { status: 500 });

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
