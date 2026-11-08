import { getCurrentUser } from "@/lib/auth";
import { addToCart, getOrCreateCartToken, linkCartToUser, resolveCart } from "@/lib/cart-server";
import { getOrderByNumber } from "@/lib/orders";
import { getProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const order = await getOrderByNumber(number);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  // A signed-in shopper can only reorder their own orders; guests can reorder
  // any order number they hold (it is the confirmation they were given).
  const user = await getCurrentUser(request);
  if (order.userId && user?.id !== order.userId) {
    return Response.json({ error: "Sign in with the account that placed this order." }, { status: 403 });
  }

  const products = await getProducts();
  const entries = order.items
    .map((item) => {
      const product = products.find((candidate) => candidate.slug === item.productSlug);
      return product ? { productId: product.id, quantity: item.quantity } : null;
    })
    .filter((entry): entry is { productId: number; quantity: number } => Boolean(entry));

  if (!entries.length) {
    return Response.json({ error: "None of those items are in stock right now." }, { status: 409 });
  }

  const token = await getOrCreateCartToken(request);
  if (user) await linkCartToUser(token, user.id);
  const cart = await addToCart(token, entries);
  const availableSlugs = new Set(products.map((product) => product.slug));
  const unavailable = order.items.filter((item) => !availableSlugs.has(item.productSlug)).map((item) => item.name);

  return Response.json({ cart, cartToken: token, added: entries.length, unavailable });
}
