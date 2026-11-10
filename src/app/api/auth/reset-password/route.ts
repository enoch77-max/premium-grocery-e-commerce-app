import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResets, sessions, users } from "@/db/schema";
import { hashPassword, hashSessionToken, rateLimit } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Consumes a single-use reset token, sets the new password and signs out every device. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string };
  const token = (body.token ?? "").trim();
  const password = body.password ?? "";

  if (!rateLimit("reset-password", 10, 60_000)) {
    return Response.json({ error: "Too many attempts — please wait a minute." }, { status: 429 });
  }
  if (!token) return Response.json({ error: "This reset link is incomplete.", field: "token" }, { status: 422 });
  if (password.length < 8) {
    return Response.json({ error: "Use at least 8 characters", field: "password" }, { status: 422 });
  }

  try {
    const rows = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, hashSessionToken(token)),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const record = rows[0];
    if (!record) {
      return Response.json({ error: "This reset link has expired. Request a new one." }, { status: 410 });
    }

    await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, record.userId));
    await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, record.id));
    // Any other open reset links become invalid, and every session is revoked.
    await db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResets.userId, record.userId), isNull(passwordResets.usedAt)));
    await db.delete(sessions).where(eq(sessions.userId, record.userId));

    return Response.json({ ok: true, message: "Password updated — sign in with your new password." });
  } catch (error) {
    console.error("reset-password failed", error);
    return Response.json({ error: "We couldn't reset that password. Try again." }, { status: 500 });
  }
}
