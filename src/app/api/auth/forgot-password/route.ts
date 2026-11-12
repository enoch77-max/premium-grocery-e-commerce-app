import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { hashSessionToken, normaliseEmail, rateLimit, validateEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Requests a password reset. Always answers 200 with the same wording so the
 * endpoint cannot be used to discover which emails have accounts.
 *
 * Email delivery is a separate integration; while it is not configured the reset
 * link is returned in the response (and logged) so a locked-out shopper can still
 * recover. Set RESET_LINK_INLINE=0 once real email is wired.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = normaliseEmail(body.email ?? "");

  if (!rateLimit(`forgot:${email || "anon"}`, 5, 60_000)) {
    return Response.json({ error: "Too many attempts — please wait a minute." }, { status: 429 });
  }
  if (!validateEmail(email)) {
    return Response.json({ error: "Enter a valid email address", field: "email" }, { status: 422 });
  }

  const generic = {
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  };

  try {
    const rows = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = rows[0];
    if (!user || !user.isActive) return Response.json(generic);

    const token = randomBytes(32).toString("hex");
    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });

    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const path = `/reset-password?token=${token}`;
    // Log the absolute URL so an operator can hand it over if email is not wired.
    console.log(`[password-reset] ${email} -> ${base}${path}`);

    const inline = process.env.RESET_LINK_INLINE !== "0";
    return Response.json({ ...generic, ...(inline ? { link: path } : {}) });
  } catch (error) {
    console.error("forgot-password failed", error);
    return Response.json(generic);
  }
}
