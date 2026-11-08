import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  claimGuestOrders,
  createSession,
  hashPassword,
  normaliseEmail,
  rateLimit,
  validateEmail,
} from "@/lib/auth";
import { getOrCreateCartToken, linkCartToUser } from "@/lib/cart-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
    marketingOptIn?: boolean;
  };

  const name = (body.name ?? "").trim();
  const email = normaliseEmail(body.email ?? "");
  const password = body.password ?? "";

  if (!rateLimit(`register:${email || "anon"}`, 6, 60_000)) {
    return Response.json({ error: "Too many attempts — please wait a minute." }, { status: 429 });
  }
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Tell us your name";
  if (!validateEmail(email)) errors.email = "Enter a valid email address";
  if (password.length < 8) errors.password = "Use at least 8 characters";
  if (Object.keys(errors).length) {
    return Response.json({ error: "Please check the highlighted fields", errors }, { status: 422 });
  }

  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) {
      return Response.json(
        { error: "An account with that email already exists — sign in instead.", field: "email" },
        { status: 409 },
      );
    }

    const inserted = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: hashPassword(password),
        marketingOptIn: body.marketingOptIn ?? true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        marketingOptIn: users.marketingOptIn,
        createdAt: users.createdAt,
      });

    const created = inserted[0];
    if (!created) throw new Error("insert failed");

    await claimGuestOrders(created.id, email);

    const cartToken = await getOrCreateCartToken(request);
    await linkCartToUser(cartToken, created.id);

    const token = await createSession(created.id, request.headers.get("user-agent") ?? "");

    return Response.json({
      user: { ...created, createdAt: created.createdAt.toISOString() },
      token,
    });
  } catch (error) {
    console.error("register failed", error);
    return Response.json({ error: "We couldn't create your account. Please try again." }, { status: 500 });
  }
}
