import {
  addToCart,
  getOrCreateCartToken,
  resolveCart,
  resolveCartForRequest,
  updateCartQuantity,
} from "@/lib/cart-server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function respond(
  cart: Awaited<ReturnType<typeof resolveCart>>,
  token: string | null,
  extra?: Record<string, unknown>,
) {
  return Response.json({ cart, cartToken: token, ...extra }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const { cart, token } = await resolveCartForRequest(request);
  return respond(cart, token);
}

export async function POST(request: Request) {
  const token = await getOrCreateCartToken(request);
  let body: { productId?: unknown; quantity?: unknown; items?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const entries: Array<{ productId: number; quantity: number }> = [];

  if (Array.isArray(body.items)) {
    for (const item of body.items as Array<{ productId?: unknown; quantity?: unknown }>) {
      const productId = Number(item?.productId);
      const quantity = Number(item?.quantity ?? 1);
      if (Number.isFinite(productId))
        entries.push({ productId, quantity: Number.isFinite(quantity) ? quantity : 1 });
    }
  } else {
    const productId = Number(body.productId);
    const quantity = Number(body.quantity ?? 1);
    if (!Number.isFinite(productId))
      return Response.json({ error: "productId is required" }, { status: 400 });
    entries.push({ productId, quantity: Number.isFinite(quantity) ? quantity : 1 });
  }

  const { cart: before } = await resolveCartForRequest(request);
  const target = before.lines.length ? before : null;
  const cart = await addToCart(token, entries);
  void target;

  // Attach the basket to an account as soon as one is signed in, so baskets
  // follow the shopper between devices.
  const user = await getCurrentUser(request);
  if (user) {
    const { linkCartToUser } = await import("@/lib/cart-server");
    await linkCartToUser(token, user.id);
  }

  return respond(cart, token);
}

export async function PATCH(request: Request) {
  const token = await getOrCreateCartToken(request);
  const body = await request.json().catch(() => null);
  const productId = Number(body?.productId);
  const quantity = Number(body?.quantity);
  if (!Number.isFinite(productId) || !Number.isFinite(quantity)) {
    return Response.json({ error: "productId and quantity are required" }, { status: 400 });
  }
  const cart = await updateCartQuantity(token, productId, quantity);
  return respond(cart, token);
}

export async function DELETE(request: Request) {
  const token = await getOrCreateCartToken(request);
  const { searchParams } = new URL(request.url);
  const productId = Number(searchParams.get("productId"));
  if (!Number.isFinite(productId)) return Response.json({ error: "productId is required" }, { status: 400 });
  const cart = await updateCartQuantity(token, productId, 0);
  return respond(cart, token);
}
