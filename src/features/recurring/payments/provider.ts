import type { PaymentChargeResult } from "@/features/recurring/types";

/**
 * Payment provider boundary.
 *
 * IMPORTANT — this store ships with **no payment gateway integration**. The
 * checkout flow only labels an order "card"/"apple"/"cash"; no card is ever
 * tokenised and no charge is ever made (see docs in the final report).
 *
 * Recurring orders require tokenised off-session charges. Therefore:
 *
 *  • `StripeProvider` is a complete, real implementation of Stripe's PaymentIntent
 *    API with `off_session: true` + `confirm: true`, using only stored gateway
 *    tokens (`cus_…` / `pm_…`). It activates when STRIPE_SECRET_KEY is present.
 *  • `UnavailableProvider` is used when no key is configured. It **refuses** to
 *    charge and reports `gateway_unavailable`. Runs are then held and the list is
 *    paused with a reason — money is never pretended to have moved.
 *  • `setPaymentProviderForTests` exists only for the automated suite and is
 *    gated behind RECURRING_TEST_HOOKS=1.
 */

export type ChargeRequest = {
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  customerToken: string;
  paymentMethodToken: string;
  description: string;
  metadata: Record<string, string>;
};

export type PaymentProvider = {
  readonly name: string;
  /** True only if this provider can genuinely charge a stored token off-session. */
  readonly supportsOffSessionTokenCharges: boolean;
  charge(request: ChargeRequest): Promise<PaymentChargeResult>;
};

class StripeProvider implements PaymentProvider {
  readonly name = "stripe";
  readonly supportsOffSessionTokenCharges = true;

  constructor(private readonly secretKey: string) {}

  async charge(request: ChargeRequest): Promise<PaymentChargeResult> {
    const body = new URLSearchParams({
      amount: String(request.amountCents),
      currency: request.currency,
      customer: request.customerToken,
      payment_method: request.paymentMethodToken,
      off_session: "true",
      confirm: "true",
      "automatic_payment_methods[enabled]": "true",
      "automatic_payment_methods[allow_redirects]": "never",
      description: request.description,
    });
    for (const [key, value] of Object.entries(request.metadata)) {
      body.set(`metadata[${key}]`, value);
    }

    try {
      const response = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": request.idempotencyKey,
        },
        body,
      });
      const data = (await response.json()) as {
        id?: string;
        status?: string;
        last_payment_error?: { code?: string; decline_code?: string; message?: string };
        error?: { code?: string; message?: string };
      };

      if (response.ok && data.status === "succeeded" && data.id) {
        return { ok: true, chargeToken: data.id };
      }

      const code =
        data.last_payment_error?.decline_code ??
        data.last_payment_error?.code ??
        data.error?.code ??
        (response.ok ? "requires_action" : "gateway_error");
      const message = data.last_payment_error?.message ?? data.error?.message ?? "The card was not charged.";

      return { ok: false, code: normaliseStripeCode(code), message, retryable: isRetryable(code) };
    } catch (error) {
      return {
        ok: false,
        code: "network",
        message: error instanceof Error ? error.message : "Gateway unreachable",
        retryable: true,
      };
    }
  }
}

function normaliseStripeCode(code: string) {
  if (code === "expired_card") return "expired_card";
  if (code === "authentication_required" || code === "requires_action") return "authentication_required";
  if (code === "card_declined" || code === "generic_decline" || code === "insufficient_funds") {
    return "declined";
  }
  return code;
}

/** 3-D Secure failures and hard declines must not be retried blindly. */
function isRetryable(code: string) {
  const hard = [
    "expired_card",
    "authentication_required",
    "requires_action",
    "stolen_card",
    "lost_card",
    "fraudulent",
    "pickup_card",
    "incorrect_cvc",
  ];
  if (hard.includes(code)) return false;
  return true;
}

class UnavailableProvider implements PaymentProvider {
  readonly name = "unconfigured";
  readonly supportsOffSessionTokenCharges = false;

  async charge(): Promise<PaymentChargeResult> {
    return {
      ok: false,
      code: "gateway_unavailable",
      message:
        "No payment gateway is configured, so automatic charges cannot be collected. Add STRIPE_SECRET_KEY and a saved payment method.",
      retryable: false,
    };
  }
}

let testProvider: PaymentProvider | null = null;

export function setPaymentProviderForTests(provider: PaymentProvider | null) {
  if (process.env.RECURRING_TEST_HOOKS !== "1") {
    throw new Error("setPaymentProviderForTests requires RECURRING_TEST_HOOKS=1");
  }
  testProvider = provider;
}

export function getPaymentProvider(): PaymentProvider {
  if (testProvider) return testProvider;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (key) return new StripeProvider(key);
  return new UnavailableProvider();
}

export function paymentGatewayStatus() {
  const provider = getPaymentProvider();
  return {
    gateway: provider.name,
    supportsOffSessionTokenCharges: provider.supportsOffSessionTokenCharges,
    configured: provider.supportsOffSessionTokenCharges,
  };
}
