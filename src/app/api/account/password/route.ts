import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  getCurrentUser,
  getSessionToken,
  hashPassword,
  revokeUserSessions,
  verifyPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (newPassword.length < 8) {
    return Response.json(
      { error: "New password must be at least 8 characters", field: "newPassword" },
      { status: 422 },
    );
  }

  try {
    const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const record = rows[0];
    if (!record || !verifyPassword(currentPassword, record.passwordHash)) {
      return Response.json(
        { error: "Your current password doesn't match", field: "currentPassword" },
        { status: 401 },
      );
    }
    await db
      .update(users)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(users.id, user.id));
    // Sign out every other device; keep this one signed in.
    await revokeUserSessions(user.id, await getSessionToken(request));
    return Response.json({ ok: true, message: "Password updated — other devices have been signed out." });
  } catch (error) {
    console.error("password change failed", error);
    return Response.json({ error: "We couldn't update your password." }, { status: 500 });
  }
}
