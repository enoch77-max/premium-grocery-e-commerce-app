import { getCurrentUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  const orders = await getOrdersForUser(user.id);
  return Response.json({ orders }, { headers: { "Cache-Control": "no-store" } });
}
