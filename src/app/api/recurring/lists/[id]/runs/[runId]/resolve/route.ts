import { getCurrentUser } from "@/lib/auth";
import { resolveHeldRun } from "@/features/recurring/services/lists";

export const dynamic = "force-dynamic";

/**
 * Customer's answer to a shortage/failure. Three calm choices, nothing technical:
 *  • continue_partial — send what is available and bill only for that
 *  • wait             — keep the list active and try again next time
 *  • cancel           — cancel this occurrence, keep the list
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = String(body.action ?? "");
  if (!["continue_partial", "wait", "cancel"].includes(action)) {
    return Response.json({ error: "Choose what you'd like us to do" }, { status: 422 });
  }

  const { id, runId } = await params;
  const result = await resolveHeldRun(
    Number(id),
    Number(runId),
    user.id,
    action as "continue_partial" | "wait" | "cancel",
  );
  if (!result) return Response.json({ error: "We couldn't find that delivery" }, { status: 404 });
  if ("rejected" in result) {
    return Response.json({ error: "That delivery is already resolved" }, { status: 409 });
  }
  return Response.json({ ok: true, state: result.state });
}
