import {
  clearCartCoupon,
  getOrCreateCartToken,
  resolveCart,
  resolveCartForRequest,
  setCartCoupon,
} from "@/lib/cart-server";

export const dynamic = "force-dynamic";

function respond(cart: Awaited<ReturnType<typeof resolveCart>>, token: string) {
  return Response.json({ cart, cartToken: token }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const token = await getOrCreateCartToken(request);
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  if (!code.trim()) return Response.json({ error: "Enter a promo code" }, { status: 400 });
  const cart = await setCartCoupon(token, code);
  return respond(cart, token);
}

export async function DELETE(request: Request) {
  const token = await getOrCreateCartToken(request);
  const cart = await clearCartCoupon(token);
  return respond(cart, token);
}

export async function GET(request: Request) {
  const { cart, token } = await resolveCartForRequest(request);
  return respond(cart, token ?? (await getOrCreateCartToken(request)));
}
