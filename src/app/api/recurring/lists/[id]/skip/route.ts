import { getCurrentUser } from "@/lib/auth";
import { skipNext } from "@/features/recurring/services/lists";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  const row = await skipNext(Number((await params).id), user.id);
  if (!row) return Response.json({ error: "List not found" }, { status: 404 });
  return Response.json({ list: row, skipped: true });
}
