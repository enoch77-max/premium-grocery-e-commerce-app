import { destroySession, getSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = await getSessionToken(request);
  await destroySession(token ?? null);
  return Response.json({ ok: true });
}
