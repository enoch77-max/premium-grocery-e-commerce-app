import { eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses, savedItems, sessions, users } from "@/db/schema";
import { destroySession, getCurrentUser, getSessionToken, verifyPassword } from "@/lib/auth";
import { invalidateConfiguredAccounts } from "@/lib/configured-accounts";

export const dynamic = "force-dynamic";

/**
 * Closes the account (GDPR "right to erasure"). Orders are retained in anonymised
 * form for accounting, but the personal profile, address book, saved items and
 * sessions are removed immediately.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { password?: string; confirm?: string };
  if ((body.confirm ?? "").trim().toUpperCase() !== "DELETE") {
    return Response.json({ error: "Type DELETE to confirm", field: "confirm" }, { status: 422 });
  }

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const record = rows[0];
  if (!record) return Response.json({ error: "Account not found" }, { status: 404 });
  if (!verifyPassword(body.password ?? "", record.passwordHash)) {
    return Response.json({ error: "That password is not correct", field: "password" }, { status: 401 });
  }

  try {
    await db.delete(addresses).where(eq(addresses.userId, user.id));
    await db.delete(savedItems).where(eq(savedItems.userId, user.id));
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await db
      .update(users)
      .set({
        isActive: false,
        name: "Deleted customer",
        phone: "",
        passwordHash: "deleted",
        marketingOptIn: false,
        orderUpdatesEmail: false,
        orderUpdatesSms: false,
      })
      .where(eq(users.id, user.id));

    invalidateConfiguredAccounts();
    await destroySession(await getSessionToken(request));
    return Response.json({ ok: true, message: "Your account has been closed." });
  } catch (error) {
    console.error("account delete failed", error);
    return Response.json(
      { error: "We couldn't close the account. Please contact support." },
      { status: 500 },
    );
  }
}
