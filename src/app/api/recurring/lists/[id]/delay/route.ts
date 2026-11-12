import { getCurrentUser } from "@/lib/auth";
import { delayNext } from "@/features/recurring/services/lists";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { until?: string };
  const until = new Date(String(body.until ?? ""));
  if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
    return Response.json({ error: "until must be a future ISO datetime" }, { status: 422 });
  }

  const row = await delayNext(Number((await params).id), user.id, until);
  if (!row) return Response.json({ error: "List not found" }, { status: 404 });
  return Response.json({ list: row, delayedUntil: until.toISOString() });
}
