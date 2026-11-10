import { and, desc, eq, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { getCurrentUser, getSessionToken, hashSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Lists the signed-in devices so a shopper can spot an unfamiliar one. */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const current = await getSessionToken(request);
  const currentHash = current ? hashSessionToken(current) : "";

  const rows = await db
    .select({
      id: sessions.id,
      token: sessions.token,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.createdAt))
    .limit(20);

  return Response.json({
    sessions: rows.map((row) => ({
      id: row.id,
      device: describeDevice(row.userAgent),
      createdAt: row.createdAt.toISOString(),
      current: row.token === currentHash,
    })),
  });
}

/** Revokes every session except the one making this request. */
export async function DELETE(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const current = await getSessionToken(request);
  if (current) {
    await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.token, hashSessionToken(current))));
  } else {
    await db.delete(sessions).where(eq(sessions.userId, user.id));
  }
  return Response.json({ ok: true, message: "Other devices signed out" });
}


function describeDevice(userAgent: string) {
  const ua = userAgent || "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : "Browser";
  const platform = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "device";
  return `${browser} on ${platform}`;
}
