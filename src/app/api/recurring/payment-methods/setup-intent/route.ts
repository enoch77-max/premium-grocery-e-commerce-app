import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentMethods, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getPaymentProvider } from "@/features/recurring/payments/provider";

export const dynamic = "force-dynamic";

/**
 * Creates (or reuses) a gateway customer and a SetupIntent so the browser can
 * collect card details in the gateway's hosted fields. Returns 503 with a kind
 * message when no gateway is configured — never a fabricated client secret.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const provider = getPaymentProvider();
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!provider.supportsOffSessionTokenCharges || !secret) {
    return Response.json(
      {
        error:
          "Card setup isn't available yet — our payment provider isn't connected. Nothing has been charged.",
        code: "gateway_unavailable",
      },
      { status: 503 },
    );
  }

  const [existing] = await db
    .select({ customerToken: paymentMethods.gatewayCustomerToken })
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, user.id))
    .limit(1);

  const [account] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  try {
    let customerToken = existing?.customerToken ?? "";
    if (!customerToken) {
      const customerBody = new URLSearchParams({
        email: account?.email ?? "",
        name: account?.name ?? "",
      });
      const customerResponse = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: customerBody,
      });
      const customer = (await customerResponse.json()) as { id?: string; error?: { message?: string } };
      if (!customer.id) {
        return Response.json(
          { error: "We couldn't reach the payment provider. Nothing has been charged." },
          { status: 502 },
        );
      }
      customerToken = customer.id;
    }

    const intentBody = new URLSearchParams({
      customer: customerToken,
      "payment_method_types[]": "card",
      usage: "off_session",
    });
    const intentResponse = await fetch("https://api.stripe.com/v1/setup_intents", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: intentBody,
    });
    const intent = (await intentResponse.json()) as { client_secret?: string };
    if (!intent.client_secret) {
      return Response.json(
        { error: "We couldn't start card setup just now. Nothing has been charged." },
        { status: 502 },
      );
    }

    return Response.json({ clientSecret: intent.client_secret, customerToken });
  } catch {
    return Response.json(
      { error: "We couldn't reach the payment provider. Nothing has been charged." },
      { status: 502 },
    );
  }
}
