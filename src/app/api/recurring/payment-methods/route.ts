import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentMethods } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { paymentGatewayStatus } from "@/features/recurring/payments/provider";

export const dynamic = "force-dynamic";

/**
 * Saved payment methods. Only gateway tokens are accepted and stored — a raw card
 * number is never a valid input here, and none of these fields can carry one.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  const rows = await db
    .select({
      id: paymentMethods.id,
      brand: paymentMethods.brand,
      last4: paymentMethods.last4,
      expMonth: paymentMethods.expMonth,
      expYear: paymentMethods.expYear,
      isDefault: paymentMethods.isDefault,
    })
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, user.id))
    .orderBy(desc(paymentMethods.isDefault));
  return Response.json({ methods: rows, gateway: paymentGatewayStatus() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    gateway?: string;
    gatewayCustomerToken?: string;
    gatewayPaymentMethodToken?: string;
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  };

  const customerToken = (body.gatewayCustomerToken ?? "").trim();
  const methodToken = (body.gatewayPaymentMethodToken ?? "").trim();
  if (!customerToken || !methodToken) {
    return Response.json(
      {
        error: "Gateway tokens are required. Cards are tokenised by the gateway, never sent to this server.",
      },
      { status: 422 },
    );
  }
  // Reject anything shaped like a PAN (12–19 digits, optionally spaced/dashed).
  // Gateway tokens legitimately embed digits (pm_1N…), so only a bare PAN fails.
  const looksLikePan = (value: string) => /^[\d][\d\s-]{10,22}[\d]$/.test(value.replace(/\s/g, ""));
  if (looksLikePan(methodToken) || looksLikePan(customerToken)) {
    return Response.json({ error: "That looks like a card number, not a gateway token." }, { status: 422 });
  }

  const [row] = await db
    .insert(paymentMethods)
    .values({
      userId: user.id,
      gateway: (body.gateway ?? "stripe").slice(0, 30),
      gatewayCustomerToken: customerToken.slice(0, 120),
      gatewayPaymentMethodToken: methodToken.slice(0, 120),
      brand: (body.brand ?? "card").slice(0, 30),
      last4: (body.last4 ?? "").replace(/\D/g, "").slice(-4),
      expMonth: body.expMonth ?? null,
      expYear: body.expYear ?? null,
      isDefault: true,
    })
    .returning({ id: paymentMethods.id });

  return Response.json({ id: row.id, gateway: paymentGatewayStatus() });
}
